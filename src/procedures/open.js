const { chromium } = require('playwright');

/**
 * Procedura per l'apertura del browser.
 * Gestisce sia il riutilizzo di un'istanza esistente che la creazione di una nuova.
 * 
 * @param {string} url - L'URL di destinazione.
 * @param {import('playwright').Browser|null} existingBrowser - L'istanza esistente del browser, se presente.
 * @param {import('playwright').Page|null} existingPage - L'istanza esistente della pagina, se presente.
 * @param {boolean} [headless=false] - Modalità headless.
 * @returns {Promise<{browser?: import('playwright').Browser, context?: import('playwright').BrowserContext, page?: import('playwright').Page, url: string}>}
 */
async function open(url, existingBrowser, existingPage, headless = false) {
    // Se il browser è già aperto, naviga semplicemente all'URL richiesto
    if (existingBrowser && existingPage) {
        console.log(`Browser già aperto. Navigazione a ${url}...`);
        await existingPage.goto(url);
        return { url };
    }

    // Altrimenti, avvia una nuova istanza di Chromium
    console.log(`Avvio del browser (Headless: ${headless})...`);
    const browser = await chromium.launch({
        headless: !!headless, // Usa la configurazione passata
        args: ['--start-maximized'] // Avvia la finestra massimizzata
    });

    // Crea un nuovo contesto (viewport: null permette di usare la risoluzione nativa)
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Naviga all'URL di default o specificato
    console.log(`Navigazione a ${url}...`);
    await page.goto(url);

    // Restituisce i riferimenti agli oggetti creati per permettere al manager di gestirli
    return {
        browser,
        context,
        page,
        url
    };
}

module.exports = open;

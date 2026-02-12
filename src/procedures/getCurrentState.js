/**
 * Recupera lo stato attuale del browser (URL e Titolo della pagina).
 * 
 * @param {import('playwright').Browser|null} browser - L'istanza del browser.
 * @param {import('playwright').Page|null} page - L'oggetto pagina di Playwright.
 * @returns {Promise<{browserOpen: boolean, url: string|null, title: string|null, error?: string}>}
 */
async function getCurrentState(browser, page) {
    // Se il browser non è proprio istanziato, restituiamo stato chiuso
    if (!browser) {
        return {
            browserOpen: false,
            url: null,
            title: null
        };
    }

    try {
        // Tenta di recuperare URL e Titolo dalla pagina attiva
        const url = page ? page.url() : null;
        const title = page ? await page.title() : null;

        return {
            browserOpen: true,
            url,
            title
        };
    } catch (error) {
        // Gestisce casi in cui il browser è aperto ma la pagina non è accessibile (es. crash o chiusura improvvisa)
        console.error('Errore durante il recupero dello stato della pagina:', error);
        return {
            browserOpen: true,
            error: error.message
        };
    }
}

module.exports = getCurrentState;

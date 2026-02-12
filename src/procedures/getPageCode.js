/**
 * Recupera il codice HTML completo della pagina corrente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @returns {Promise<string>} - Il contenuto HTML della pagina.
 * @throws {Error} Se la pagina non è disponibile.
 */
async function getPageCode(page) {
    if (!page) {
        throw new Error('Page not available to retrieve code.');
    }

    console.log('Recupero codice pagina in corso...');
    return await page.content();
}

module.exports = getPageCode;

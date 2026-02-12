/**
 * Cattura uno screenshot della pagina corrente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @returns {Promise<string>} - Lo screenshot codificato in Base64.
 * @throws {Error} Se la pagina non è disponibile.
 */
async function screenshot(page) {
    if (!page) {
        throw new Error('Page not available to take screenshot.');
    }

    console.log('Cattura screenshot in corso...');
    // Restituisce un buffer che poi convertiamo in base64
    const buffer = await page.screenshot({ fullPage: false });
    return buffer.toString('base64');
}

module.exports = screenshot;

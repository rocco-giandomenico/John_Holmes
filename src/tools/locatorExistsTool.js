/**
 * Verifica se un locator esiste nella pagina attuale.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore da verificare (CSS, XPath, Text, ecc.).
 * @param {number} timeout - Tempo massimo di attesa in millisecondi (default 0, controllo immediato).
 * @returns {Promise<boolean>} - True se il locator esiste e (opzionalmente) è visibile, False altrimenti.
 */
async function checkLocatorExists(page, locator, timeout = 0) {
    try {
        const element = page.locator(locator);
        if (timeout > 0) {
            await element.waitFor({ state: 'attached', timeout });
        }
        const count = await element.count();
        return count > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Verifica se un locator è visibile all'utente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore da verificare.
 * @returns {Promise<boolean>}
 */
async function isLocatorVisible(page, locator) {
    try {
        return await page.locator(locator).isVisible();
    } catch (error) {
        return false;
    }
}

module.exports = {
    checkLocatorExists,
    isLocatorVisible
};

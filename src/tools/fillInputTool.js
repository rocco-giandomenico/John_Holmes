const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Inserisce un valore in un campo di input in modo sicuro e resiliente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore del campo di input.
 * @param {string|number} value - Il valore da inserire.
 * @returns {Promise<boolean>} - True se l'operazione è riuscita.
 */
async function fillInput(page, locator, value) {
    try {
        await withRetry(async () => {
            const input = page.locator(locator);

            // Attende che l'elemento sia visibile
            await input.waitFor({ state: 'visible', timeout: 5000 });

            // Inserisce il valore
            await input.fill(value.toString());
            console.log(`Valore '${value}' inserito nel campo: ${locator}`);

            // Attesa overlay post-inserimento
            await waitForOverlay(page);
        }, configLoader.get('TOOLS_RETRY', 2), 1000); // Usa config o default 2

        return true;
    } catch (error) {
        console.error(`Fallimento definitivo dopo i tentativi per (${locator}):`, error.message);
        return false;
    }
}

/**
 * Recupera il valore attuale di un campo di input.
 * 
 * @param {import('playwright').Page} page 
 * @param {string} locator 
 * @returns {Promise<string>}
 */
async function getInputValue(page, locator) {
    try {
        return await page.locator(locator).inputValue();
    } catch (error) {
        return '';
    }
}

module.exports = {
    fillInput,
    getInputValue
};

const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Inserisce un valore in un campo di input in modo sicuro e resiliente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore del campo di input.
 * @param {string|number} value - Il valore da inserire.
 * @returns {Promise<{success: boolean, error?: string}>} - Esito dell'operazione.
 */
async function fillInput(page, locator, value) {
    let lastErrorMessage = null;

    try {
        await withRetry(async () => {
            const input = page.locator(locator);

            // Attende che l'elemento sia visibile
            await input.waitFor({ state: 'visible', timeout: 5000 });

            // Pulisce l'input preventivamente e inserisce il valore
            await input.fill('');
            await page.waitForTimeout(500); // Piccola pausa per stabilizzare il DOM
            await input.fill(value.toString());
            console.log(`Valore '${value}' inserito nel campo: ${locator}`);

            // Attesa overlay post-inserimento (con controllo popup)
            await waitForOverlay(page, 30000, true);
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error; // Rilancia per interruzione immediata
        }
        console.error(`Fallimento definitivo per (${locator}):`, error.message);
        return { success: false, error: error.message };
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

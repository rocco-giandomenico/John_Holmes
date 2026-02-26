const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Seleziona un'opzione da un menu a tendina in modo sicuro e resiliente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore del campo select.
 * @param {string} value - Il valore o l'etichetta da selezionare.
 * @param {number} timeout - Tempo massimo di attesa (default 5000ms).
 * @returns {Promise<boolean>} - True se l'operazione è riuscita.
 */
async function selectOption(page, locator, value, timeout = 5000) {
    try {
        await withRetry(async () => {
            const select = page.locator(locator);

            // Attende che l'elemento sia presente nel DOM
            await select.waitFor({ state: 'attached', timeout });

            // Seleziona l'opzione
            await select.selectOption(value);
            console.log(`Opzione '${value}' selezionata nel menu: ${locator}`);

            // ATTESA OVERLAY + MODAL post-selezione
            await waitForOverlay(page, 30000, true);
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }
        console.error(`Fallimento definitivo dopo i tentativi per select (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Recupera l'opzione attualmente selezionata in un menu a tendina.
 * 
 * @param {import('playwright').Page} page 
 * @param {string} locator 
 * @returns {Promise<string>}
 */
async function getSelectedOption(page, locator) {
    try {
        return await page.locator(locator).evaluate(node => node.value);
    } catch (error) {
        return '';
    }
}

module.exports = {
    selectOption,
    getSelectedOption
};

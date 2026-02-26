const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Esegue un click su un elemento.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore dell'elemento da cliccare.
 * @param {number} timeout - Tempo massimo di attesa (default 5000ms).
 * @returns {Promise<{success: boolean, error?: string}>} - Esito dell'operazione.
 */
async function clickElement(page, locator, timeout = 5000) {
    try {
        await withRetry(async () => {
            const element = page.locator(locator);
            await element.waitFor({ state: 'visible', timeout });
            await element.click();
            console.log(`Click eseguito su: ${locator}`);

            // Attesa overlay post-click (con controllo popup)
            await waitForOverlay(page, 30000, true);
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }
        console.error(`Fallimento click per (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    clickElement
};

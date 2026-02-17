const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Seleziona un pulsante radio in modo sicuro e resiliente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore del pulsante radio.
 * @returns {Promise<boolean>} - True se l'operazione è riuscita.
 */
async function checkRadioButton(page, locator) {
    try {
        await withRetry(async () => {
            const radioButton = page.locator(locator);

            // Attende che l'elemento sia presente nel DOM
            await radioButton.waitFor({ state: 'attached', timeout: 5000 });

            // Verifica se è già selezionato
            const isAlreadyChecked = await radioButton.isChecked();

            if (!isAlreadyChecked) {
                console.log(`Selezionando radio button: ${locator}`);
                await radioButton.check({ force: true });
            } else {
                console.log(`Radio button già selezionato: ${locator}`);
            }

            // ATTESA OVERLAY + MODAL (Sempre, per catturare errori asincroni della pagina)
            await waitForOverlay(page, 30000, true);
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }
        console.error(`Fallimento definitivo dopo i tentativi per radio (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica se una radio button specifica è selezionata.
 * 
 * @param {import('playwright').Page} page 
 * @param {string} locator 
 * @returns {Promise<boolean>}
 */
async function isRadioChecked(page, locator) {
    try {
        return await page.locator(locator).isChecked();
    } catch (error) {
        return false;
    }
}

module.exports = {
    checkRadioButton,
    isRadioChecked
};

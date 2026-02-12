const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');

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

                // ATTESA OVERLAY post-selezione
                await waitForOverlay(page);
            } else {
                console.log(`Radio button già selezionato: ${locator}`);
            }
        }, 2, 1000);

        return true;
    } catch (error) {
        console.error(`Fallimento definitivo dopo i tentativi per radio (${locator}):`, error.message);
        return false;
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

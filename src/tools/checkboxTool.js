const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Gestisce una checkbox, assicurandosi che sia nello stato desiderato (checked o unchecked).
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore della checkbox.
 * @param {boolean} shouldBeChecked - Se true, la checkbox deve essere selezionata. Se false, deselezionata.
 * @param {number} timeout - Tempo massimo di attesa (default 15000ms).
 * @returns {Promise<{success: boolean, error?: string}>} - Esito dell'operazione.
 */
async function setCheckbox(page, locator, shouldBeChecked = true, timeout = 15000, retries = null) {
    const finalRetries = retries !== null ? retries : configLoader.get('TOOLS_RETRY', 2);
    try {
        await withRetry(async () => {
            const checkbox = page.locator(locator);

            // Attende che l'elemento sia presente nel DOM
            await checkbox.waitFor({ state: 'attached', timeout });

            const isCurrentlyChecked = await checkbox.isChecked();

            if (shouldBeChecked !== isCurrentlyChecked) {
                console.log(`${shouldBeChecked ? 'Selezionando' : 'Deselezionando'} checkbox: ${locator}`);
                if (shouldBeChecked) {
                    await checkbox.check({ force: true });
                } else {
                    await checkbox.uncheck({ force: true });
                }
            } else {
                console.log(`Checkbox ${locator} già nello stato desiderato: ${shouldBeChecked ? 'Selezionata' : 'Deselezionata'}`);
            }

            // Attesa overlay post-azione
            await waitForOverlay(page, 60000, true);
        }, finalRetries, 1000);

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }
        console.error(`Fallimento checkbox per (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    setCheckbox
};

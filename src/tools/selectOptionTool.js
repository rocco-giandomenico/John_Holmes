const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');

/**
 * Seleziona un'opzione da un menu a tendina in modo sicuro e resiliente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore del campo select.
 * @param {string} value - Il valore o l'etichetta da selezionare.
 * @returns {Promise<boolean>} - True se l'operazione è riuscita.
 */
async function selectOption(page, locator, value) {
    try {
        await withRetry(async () => {
            const select = page.locator(locator);

            // Attende che l'elemento sia presente nel DOM
            await select.waitFor({ state: 'attached', timeout: 5000 });

            // Seleziona l'opzione
            await select.selectOption(value);
            console.log(`Opzione '${value}' selezionata nel menu: ${locator}`);

            // ATTESA OVERLAY post-selezione
            await waitForOverlay(page);
        }, 2, 1000);

        return true;
    } catch (error) {
        console.error(`Fallimento definitivo dopo i tentativi per select (${locator}):`, error.message);
        return false;
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

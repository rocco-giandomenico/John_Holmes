const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Esegue un click su TUTTI gli elementi visibili che corrispondono al selettore.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore degli elementi da cliccare.
 * @param {number} timeout - Tempo massimo di attesa iniziale (default 5000ms).
 * @returns {Promise<{success: boolean, clickedCount: number, error?: string}>} - Esito dell'operazione.
 */
async function clickAllElements(page, locator, timeout = 15000, isBlocking = true) {
    try {
        let clickedCount = 0;

        await withRetry(async () => {
            const elements = page.locator(locator);

            const allElements = await elements.all();
            
            if (allElements.length === 0) {
                console.log(`Nessun elemento trovato per il selettore: ${locator}. Salto direttamente.`);
                return;
            }

            console.log(`Trovati ${allElements.length} elementi per il selettore: ${locator}`);

            for (const el of allElements) {
                if (await el.isVisible() && await el.isEnabled()) {
                    await el.click();
                    clickedCount++;
                    console.log(`Click eseguito su elemento visibile e abilitato (${clickedCount})`);

                    // Attesa overlay post-singolo click (per gestire loader tra un click e l'altro)
                    await waitForOverlay(page, 60000, true);

                    // Piccola pausa di sicurezza per stabilità DOM
                    await page.waitForTimeout(500);
                } else {
                    console.log(`Elemento trovato per ${locator} ma ignorato perché non visibile o disabilitato.`);
                }
            }
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true, clickedCount };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }

        if (!isBlocking) {
            console.log(`[OPTIONAL] Fallimento click_all per (${locator}) dopo tentativi di retry: ${error.message}. Passo oltre.`);
            return { success: true, clickedCount: 0, skipped: true };
        }

        console.error(`Fallimento click_all per (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    clickAllElements
};

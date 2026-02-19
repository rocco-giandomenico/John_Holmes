const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Estrae un valore da un elemento della pagina.
 * 
 * @param {import('playwright').Page} page - La pagina del browser.
 * @param {string} locator - Il selettore dell'elemento.
 * @param {string} mode - Modalità di estrazione: 'text', 'value', 'attribute(attrName)'.
 * @returns {Promise<{success: boolean, value?: string, error?: string}>}
 */
async function extractValue(page, locator, mode = 'text') {
    try {
        const result = await withRetry(async () => {
            const element = page.locator(locator);

            // Attende che l'elemento sia presente nel DOM (non necessariamente visibile per l'estrazione)
            await element.waitFor({ state: 'attached', timeout: 5000 });

            let value;
            if (mode === 'text') {
                value = await element.innerText();
            } else if (mode === 'value') {
                value = await element.inputValue();
            } else if (mode.startsWith('attribute')) {
                const attrName = mode.match(/attribute\((.+)\)/)?.[1];
                if (!attrName) throw new Error(`Formato attributo non valido: ${mode}`);
                value = await element.getAttribute(attrName);
            } else {
                throw new Error(`Modalità di estrazione non supportata: ${mode}`);
            }

            console.log(`Valore estratto da '${locator}' (mode: ${mode}): ${value}`);
            return value;
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true, value: result };
    } catch (error) {
        console.error(`Fallimento estrazione per (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { extractValue };

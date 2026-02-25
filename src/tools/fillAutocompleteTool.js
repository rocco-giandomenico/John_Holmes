const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Gestisce i campi Autocomplete (Typeahead).
 * Scrive nel campo, attende il menu dei suggerimenti e clicca l'opzione desiderata.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} inputLocator - Il selettore del campo di input.
 * @param {string} value - Il testo da scrivere nel campo.
 * @param {string} selectionValue - (Opzionale) Il testo esatto da selezionare nel menu. Se non fornito, usa 'value'.
 * @param {string} resultSelector - (Opzionale) Il selettore per le opzioni del menu (default: 'ul.dropdown-menu li a').
 * @returns {Promise<boolean>} - True se l'operazione è riuscita.
 */
async function fillAutocomplete(page, inputLocator, value, selectionValue = null, resultSelector = 'ul.dropdown-menu li a') {
    try {
        await withRetry(async () => {
            const input = page.locator(inputLocator);

            // 1. Assicuriamoci che il campo sia visibile
            await input.waitFor({ state: 'visible', timeout: 5000 });

            // 2. Scriviamo il valore (usa fill che è più rapido e affidabile, scatena input/change)
            await input.fill('');
            await page.waitForTimeout(500); // Piccola pausa per stabilizzare il DOM
            await input.fill(value);
            console.log(`Testo '${value}' digitato in: ${inputLocator}`);

            // 3. Attendiamo che appaia ALMENO UN elemento del menu
            const itemSelector = `${resultSelector}`;
            // Usiamo .first() solo per aspettare che "qualcosa" appaia
            try {
                // Attendi che il primo risultato sia visibile (timeout 5s)
                await page.locator(itemSelector).first().waitFor({ state: 'visible', timeout: 5000 });
            } catch (e) {
                console.warn(`Menu suggerimenti non apparso per '${value}'. Possibile errore di rete o input.`);
                throw e; // Rilancia per attivare il retry
            }

            // 4. Selezione Rigorosa: Cerchiamo l'opzione che corrisponde al valore target
            const targetValue = (selectionValue || value).toUpperCase();

            // Recuperiamo tutte le opzioni visibili
            const options = await page.locator(itemSelector).all();
            let matchFound = false;

            console.log(`Ricerca match per: '${targetValue}' nel menu suggerimenti...`);

            for (const option of options) {
                // Controlla che sia effettivamente visibile (doppia sicurezza)
                if (await option.isVisible()) {
                    const text = await option.textContent();
                    // Confronto case-insensitive ma ESATTO (trim sugli spazi)
                    if (text && text.trim().toUpperCase() === targetValue) {
                        await option.click();
                        console.log(`Opzione ESATTA '${text.trim()}' cliccata dal menu.`);
                        matchFound = true;
                        break;
                    }
                }
            }

            if (!matchFound) {
                console.warn(`Nessuna corrispondenza esatta per '${value}' trovata nel menu.`);
                // Log opzioni disponibili per debug
                for (const opt of options) {
                    if (await opt.isVisible()) console.warn(`- Disponibile: ${await opt.textContent()}`);
                }
                throw new Error(`Impossibile trovare match esatto per: ${value}`);
            }

            // 5. Attesa finale per eventuali ricalcoli (overlay + modal)
            await waitForOverlay(page, 30000, true);

        }, configLoader.get('TOOLS_RETRY', 2), 1000); // Usa config o default 2

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }
        console.error(`Errore Autocomplete per (${inputLocator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    fillAutocomplete
};

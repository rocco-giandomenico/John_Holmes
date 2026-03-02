const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Calcola il punteggio di somiglianza tra due stringhe utilizzando l'algoritmo di Levenshtein.
 * Restituisce un valore tra 0 e 1 (1 = identiche).
 */
function getSimilarityScore(s1, s2) {
    const v1 = s1.toUpperCase().trim();
    const v2 = s2.toUpperCase().trim();

    if (v1 === v2) return 1.0;
    if (v1.length === 0 || v2.length === 0) return 0.0;

    const costs = [];
    for (let i = 0; i <= v1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= v2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (v1.charAt(i - 1) !== v2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[v2.length] = lastValue;
    }

    const distance = costs[v2.length];
    return 1.0 - (distance / Math.max(v1.length, v2.length));
}

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
            await input.waitFor({ state: 'visible', timeout: 15000 });

            // 2. Scriviamo il valore (usa fill che è più rapido e affidabile, scatena input/change)
            await input.fill('');
            await page.waitForTimeout(500); // Piccola pausa per stabilizzare il DOM
            await input.fill(value);
            console.log(`Testo '${value}' digitato in: ${inputLocator}`);

            // 3. Attendiamo che appaia ALMENO UN elemento del menu
            const itemSelector = `${resultSelector}`;
            // Usiamo .first() solo per aspettare che "qualcosa" appaia
            try {
                // Attendi che il primo risultato sia visibile (timeout 15s)
                await page.locator(itemSelector).first().waitFor({ state: 'visible', timeout: 15000 });
            } catch (e) {
                console.warn(`Menu suggerimenti non apparso per '${value}'. Possibile errore di rete o input.`);
                throw e; // Rilancia per attivare il retry
            }

            // 4. Selezione tramite Punteggio di Somiglianza
            const targetValue = (selectionValue || value).toUpperCase().trim();
            const options = await page.locator(itemSelector).all();

            let bestOption = null;
            let maxScore = -1;
            let bestText = "";

            console.log(`Analisi somiglianza per: '${targetValue}'...`);

            for (const option of options) {
                if (await option.isVisible()) {
                    const text = (await option.textContent() || "").trim();
                    const score = getSimilarityScore(text, targetValue);

                    if (score > maxScore) {
                        maxScore = score;
                        bestOption = option;
                        bestText = text;
                    }

                    // Se troviamo un match perfetto, fermiamoci
                    if (score === 1.0) break;
                }
            }

            if (bestOption && maxScore >= 0) {
                console.log(`Miglior match trovato: '${bestText}' (Punteggio: ${(maxScore * 100).toFixed(2)}%)`);
                await bestOption.click();
            } else {
                throw new Error(`Nessun suggerimento utilizzabile nel menu per: ${value}`);
            }

            // 5. Attesa finale per eventuali ricalcoli (overlay + modal)
            await waitForOverlay(page, 60000, true);

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

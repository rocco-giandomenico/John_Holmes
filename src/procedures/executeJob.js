const { fillInput } = require('../tools/fillInputTool');
const { fillAutocomplete } = require('../tools/fillAutocompleteTool');
const { checkRadioButton } = require('../tools/radioTool');
const { selectOption } = require('../tools/selectOptionTool');
const { setAccordionState } = require('../tools/accordionTool');
const { clickElement } = require('../tools/clickTool');
const { extractValue } = require('../tools/extractValueTool');

// Import predefined procedures
const initPDAProcedure = require('./initPDA');

/**
 * Risolve ricorsivamente i placeholder {{var_name}} in un oggetto o stringa.
 * 
 * @param {any} obj - L'oggetto o stringa da processare.
 * @param {Object} variables - L'oggetto contenente le variabili correnti.
 * @returns {any} - L'oggetto con le variabili risolte.
 */
function resolveVariables(obj, variables) {
    if (typeof obj === 'string') {
        return obj.replace(/\{\{(.+?)\}\}/g, (match, varName) => {
            const trimmedName = varName.trim();
            return variables[trimmedName] !== undefined ? variables[trimmedName] : match;
        });
    }

    if (Array.isArray(obj)) {
        return obj.map(item => resolveVariables(item, variables));
    }

    if (obj !== null && typeof obj === 'object') {
        const resolved = {};
        for (const [key, value] of Object.entries(obj)) {
            resolved[key] = resolveVariables(value, variables);
        }
        return resolved;
    }

    return obj;
}

/**
 * Procedura di esecuzione job con sequenza di azioni.
 * Esegue una lista piatta di azioni in sequenza.
 * 
 * @param {import('playwright').Page} page - Pagina del browser.
 * @param {Object} data - Oggetto contenente l'array di azioni { actions: [...] }.
 * @param {Function} updateStatus - Callback per il progresso (progress, lastAction).
 */
async function executeJob(page, data, updateStatus) {
    const rawActions = data.actions || [];
    if (!Array.isArray(rawActions)) {
        throw new Error('Il campo "actions" deve essere un array.');
    }

    // Inizializzazione bus variabili per il job corrente
    const variables = {};

    console.log(`Avvio sequenza di ${rawActions.length} azioni PDA...`);

    for (let i = 0; i < rawActions.length; i++) {
        // Risolviamo i template prima di ogni azione usando lo stato attuale delle variabili
        const action = resolveVariables(rawActions[i], variables);
        const progress = Math.floor((i / rawActions.length) * 100);

        // Generazione descrizione più pulita per i log
        let actionDesc = action.description || action.name || action.locator;
        if (!actionDesc) {
            if (action.type === 'wait') {
                actionDesc = `Wait ${action.value || action.ms || 1000}ms`;
            } else {
                actionDesc = `${action.type} su ${action.locator || 'elemento'}`;
            }
        }

        console.log(`[Action ${i + 1}/${rawActions.length}] ${action.type}: ${actionDesc}`);
        await updateStatus(progress, actionDesc);

        try {
            let success = true;
            let result;

            switch (action.type) {
                case 'procedure':
                    if (action.name === 'initPDA') {
                        result = await initPDAProcedure(page);
                        success = result.success;
                        if (!success) actionDesc += ` (Failed: ${result.message})`;
                    } else {
                        console.warn(`Procedura non riconosciuta: ${action.name}`);
                        success = false;
                        actionDesc += ` (Procedura non riconosciuta)`;
                    }
                    break;
                case 'extract':
                    result = await extractValue(page, action.locator, action.mode || 'text');
                    success = result.success;
                    if (success && action.variable) {
                        variables[action.variable] = result.value;
                        console.log(`Variabile salvata: ${action.variable} = "${result.value}"`);
                    }
                    break;
                case 'transform':
                    const input = action.input || '';
                    if (action.regex) {
                        const regex = new RegExp(action.regex);
                        const match = input.match(regex);
                        if (match && action.variables && Array.isArray(action.variables)) {
                            action.variables.forEach((varName, idx) => {
                                // I gruppi di cattura partono da match[1]
                                variables[varName] = match[idx + 1] || '';
                                console.log(`Variabile trasformata: ${varName} = "${variables[varName]}"`);
                            });
                        } else if (!match) {
                            console.warn(`Regex '${action.regex}' non ha prodotto match su '${input}'`);
                        }
                    }
                    break;
                case 'open_accordion':
                case 'close_accordion':
                    const state = action.type === 'open_accordion' ? 'open' : 'close';
                    const selector = action.name || action.value || action.locator;
                    await setAccordionState(page, selector, state);
                    break;
                case 'fill':
                case 'text':
                    result = await fillInput(page, action.locator, action.value);
                    success = result.success;
                    break;
                case 'autocomplete':
                    result = await fillAutocomplete(page, action.locator, action.value);
                    success = result.success;
                    break;
                case 'radio':
                    result = await checkRadioButton(page, action.locator);
                    success = result.success;
                    break;
                case 'select':
                    result = await selectOption(page, action.locator, action.value);
                    success = result.success;
                    break;
                case 'click':
                case 'button':
                    result = await clickElement(page, action.locator);
                    success = result.success;
                    break;
                case 'wait':
                    const ms = parseInt(action.value || action.ms || 1000);
                    await page.waitForTimeout(ms);
                    break;
                default:
                    console.warn(`Tipo azione non supportato: ${action.type}`);
                    success = false;
            }

            if (!success) {
                const toolError = result?.error || result?.message || 'Il tool ha restituito fallimento.';
                throw new Error(toolError);
            }

        } catch (err) {
            console.error(`Errore durante l'azione ${i + 1} (${action.type}): ${err.message}`);
            throw new Error(`Fallimento azione ${i + 1} (${actionDesc}): ${err.message}`);
        }

        // Attesa di default tra un'operazione e l'altra (tranne l'ultima)
        if (i < rawActions.length - 1) {
            await page.waitForTimeout(1000);
        }
    }

    await updateStatus(100, 'Inserimento completato.');
    console.log('Sequenza completata con successo.');
    return { success: true, message: 'Sequenza completata con successo.' };
}

module.exports = executeJob;

module.exports = executeJob;

const { fillInput } = require('../tools/fillInputTool');
const { fillAutocomplete } = require('../tools/fillAutocompleteTool');
const { checkRadioButton } = require('../tools/radioTool');
const { selectOption } = require('../tools/selectOptionTool');
const { setAccordionState } = require('../tools/accordionTool');

// Import predefined procedures
const initPDAProcedure = require('./initPDA');

/**
 * Procedura di esecuzione job con sequenza di azioni.
 * Esegue una lista piatta di azioni in sequenza.
 * 
 * @param {import('playwright').Page} page - Pagina del browser.
 * @param {Object} data - Oggetto contenente l'array di azioni { actions: [...] }.
 * @param {Function} updateStatus - Callback per il progresso (progress, lastAction).
 */
async function executeJob(page, data, updateStatus) {
    const actions = data.actions || [];
    if (!Array.isArray(actions)) {
        throw new Error('Il campo "actions" deve essere un array.');
    }

    console.log(`Avvio sequenza di ${actions.length} azioni PDA...`);

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const progress = Math.floor((i / actions.length) * 100);

        // Generazione descrizione più pulita per i log
        let actionDesc = action.description || action.name || action.locator;
        if (!actionDesc) {
            if (action.type === 'wait') {
                actionDesc = `Wait ${action.value || action.ms || 1000}ms`;
            } else {
                actionDesc = `${action.type} su ${action.locator || 'elemento'}`;
            }
        }

        console.log(`[Action ${i + 1}/${actions.length}] ${action.type}: ${actionDesc}`);
        await updateStatus(progress, actionDesc);

        try {
            switch (action.type) {
                case 'procedure':
                    if (action.name === 'initPDA') {
                        await initPDAProcedure(page);
                    } else {
                        console.warn(`Procedura non riconosciuta: ${action.name}`);
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
                    await fillInput(page, action.locator, action.value);
                    break;
                case 'autocomplete':
                    await fillAutocomplete(page, action.locator, action.value);
                    break;
                case 'radio':
                    await checkRadioButton(page, action.locator);
                    break;
                case 'select':
                    await selectOption(page, action.locator, action.value);
                    break;
                case 'click':
                case 'button':
                    await page.locator(action.locator).click();
                    break;
                case 'wait':
                    const ms = parseInt(action.value || action.ms || 1000);
                    await page.waitForTimeout(ms);
                    break;
                default:
                    console.warn(`Tipo azione non supportato: ${action.type}`);
            }
        } catch (err) {
            console.error(`Errore durante l'azione ${i + 1} (${action.type}): ${err.message}`);
            // In una sequenza, spesso è meglio fermarsi se un'azione fallisce
            throw new Error(`Fallimento azione ${i + 1} (${actionDesc}): ${err.message}`);
        }

        // Attesa di default tra un'operazione e l'altra (tranne l'ultima)
        if (i < actions.length - 1) {
            console.log('Attesa 1s tra operazioni...');
            await page.waitForTimeout(1000);
        }
    }

    await updateStatus(100, 'Inserimento completato.');
    console.log('Sequenza PDA completata.');
    return { success: true, message: 'Sequenza completata con successo.' };
}

module.exports = executeJob;

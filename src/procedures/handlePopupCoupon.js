const { waitForOverlay } = require('../tools/waitForOverlayTool');

/**
 * Procedura per gestire i popup esterni (nuove finestre).
 * Emette il click, intercetta la nuova pagina, interagisce con essa e attende la chiusura.
 * 
 * @param {import('playwright').Page} page - Pagina principale.
 * @param {Object} action - Oggetto azione con locator e parametri.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handlePopupCoupon(page, action) {
    try {
        const context = page.context();
        let popup;

        // 1. Verifichiamo se il popup esiste già (es. finestra già aperta)
        const pages = context.pages();
        if (pages.length > 1) {
            popup = pages[pages.length - 1];
            console.log(`[PROCEDURE] Popup già esistente rilevato.`);
        } else {
            // 2. Se non esiste, prepariamo l'ascolto e clicchiamo per aprirlo
            console.log(`[PROCEDURE] Nessun popup attivo. Clicco su ${action.locator || 'trigger'} e attendo apertura...`);

            const popupPromise = page.waitForEvent('popup', { timeout: 10000 });

            // Se è stato fornito un locator, clicchiamo
            if (action.locator) {
                await page.locator(action.locator).click();
            }

            popup = await popupPromise;
            console.log(`[PROCEDURE] Nuovo popup rilevato.`);
        }

        await popup.waitForLoadState('domcontentloaded');
        console.log(`[PROCEDURE] Popup caricato (DOM).`);

        // 4. Logica specifica del coupon
        if (action.coupon && action.coupon !== '') {
            console.log(`[PROCEDURE] Coupon rilevato: ${action.coupon}`);
        }

        // 5. Clicca su Procedi e attendi la chiusura della finestra
        const proceedBtn = popup.getByRole('button', { name: /Procedi/i });

        // Aspettiamo che il bottone sia cliccabile senza caricamenti infiniti
        console.log(`[PROCEDURE] Attesa pulsante 'Procedi'...`);
        await proceedBtn.waitFor({ state: 'visible', timeout: 5000 });

        console.log(`[PROCEDURE] Clicco su 'Procedi'...`);
        await Promise.all([
            popup.waitForEvent('close', { timeout: 5000 }).catch(() => console.log("[PROCEDURE] Popup non si è chiuso da solo, proseguo.")),
            proceedBtn.click().catch(() => popup.close())
        ]);

        console.log(`[PROCEDURE] Popup gestito.`);

        // 6. Attesa stabilità sulla pagina principale
        // Dato che il popup scatenato spesso avvia una navigazione sulla pagina principale,
        // attendiamo che il caricamento della main page sia completato.
        console.log(`[PROCEDURE] Attesa stabilità pagina principale...`);
        await page.waitForLoadState('load', { timeout: 15000 }).catch(() => { });
        await page.waitForTimeout(1000); // Piccolo buffer extra

        await waitForOverlay(page, 30000, true);

        return { success: true };
    } catch (error) {
        console.error(`[PROCEDURE ERROR] Errore durante la gestione del popup:`, error.message);
        return { success: false, message: error.message };
    }
}

module.exports = handlePopupCoupon;

/**
 * Attende che l'overlay di caricamento della pagina (#overlay) scompaia.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {number} maxWaitTime - Tempo massimo di attesa totale in millisecondi (default 30s).
 * @param {boolean} checkForPopup - Se true, verifica anche la presenza di popup bloccanti.
 */
async function waitForOverlay(page, maxWaitTime = 60000, checkForPopup = false) {
    const overlaySelector = '#overlay, .loadingBox.overlay';

    try {
        const startTime = Date.now();
        const getTimestamp = () => new Date().toISOString().split('T')[1].split('Z')[0];

        console.log(`[${getTimestamp()}] [DEBUG] Controllo presenza overlay di caricamento...`);

        // 1. Diamo un piccolo margine (100ms) affinché l'overlay appaia se deve apparire
        await page.waitForTimeout(100);

        const overlay = page.locator(overlaySelector);

        // Verifica se ALMENO UNO degli overlay è visibile
        const isVisible = await overlay.evaluateAll(els =>
            els.some(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
        ).catch(() => false);

        if (isVisible) {
            const overlayText = await overlay.first().innerText().catch(() => '');
            console.log(`[${getTimestamp()}] [DEBUG] Overlay rilevato [${overlayText.trim()}]. Attendo il completamento dell'operazione... (Timeout: ${maxWaitTime}ms)`);

            // 2. Attendiamo che TUTTI gli elementi del selettore siano nascosti o rimossi
            const waitStart = Date.now();
            await page.waitForFunction((sel) => {
                const els = document.querySelectorAll(sel);
                return Array.from(els).every(el => {
                    const style = window.getComputedStyle(el);
                    return style.display === 'none' || style.visibility === 'hidden';
                });
            }, overlaySelector, { timeout: maxWaitTime });
            const waitEnd = Date.now();

            console.log(`[${getTimestamp()}] [DEBUG] Overlay rimosso dopo ${waitEnd - waitStart}ms. Pagina pronta.`);
            // 3. Piccolo buffer di sicurezza post-caricamento per stabilità DOM
            await page.waitForTimeout(500);
        } else {
            console.log(`[${getTimestamp()}] [DEBUG] Nessun overlay rilevato dopo ${Date.now() - startTime}ms, procedo.`);
        }

        // --- CONTROLLO POPUP DI BLOCCO (Solo se esplicitamente richiesto dai tool) ---
        if (checkForPopup) {
            const modal = page.locator('.modal-content');
            const isModalVisible = await modal.isVisible().catch(() => false);

            if (isModalVisible) {
                const modalText = (await modal.first().innerText()).trim().replace(/\n/g, ' ');

                // Eccezione per la modale di verifica copertura (case-insensitive)
                const targetTitle = 'Verifica la disponibilità del servizio FASTWEB'.toLowerCase();
                if (modalText.toLowerCase().includes(targetTitle)) {
                    console.log(`[MODAL IGNORED] Trovata modale di copertura: "${modalText}". Procedo.`);
                } else {
                    console.warn(`[POPUP DETECTED] ${modalText}`);
                    // Interrompiamo immediatamente il job riportando il messaggio del popup
                    throw new Error(`POPUP_DETECTED: ${modalText}`);
                }
            }
        }
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error; // Rilancia per bloccare l'esecuzione
        }
        console.warn('Timeout o errore durante l\'attesa dell\'overlay:', error.message);
    }
}

module.exports = {
    waitForOverlay
};

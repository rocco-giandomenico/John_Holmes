/**
 * Attende che l'overlay di caricamento della pagina (#overlay) scompaia.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {number} maxWaitTime - Tempo massimo di attesa totale in millisecondi (default 30s).
 * @param {boolean} checkForPopup - Se true, verifica anche la presenza di popup bloccanti.
 */
async function waitForOverlay(page, maxWaitTime = 30000, checkForPopup = false) {
    const overlaySelector = '#overlay';

    try {
        console.log('Controllo presenza overlay di caricamento...');

        // 1. Diamo un piccolo margine (200ms) affinché l'overlay appaia se deve apparire
        await page.waitForTimeout(200);

        const overlay = page.locator(overlaySelector);

        // Verifica se l'overlay è visibile (display !== none)
        const isVisible = await overlay.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }).catch(() => false);

        if (isVisible) {
            console.log('Overlay rilevato. Attendo il completamento dell\'operazione...');

            // 2. Attendiamo che l'overlay torni in 'display: none' o venga rimosso
            await overlay.waitFor({ state: 'hidden', timeout: maxWaitTime });

            console.log('Overlay rimosso. Pagina pronta.');
            // 3. Piccolo buffer di sicurezza post-caricamento per stabilità DOM
            await page.waitForTimeout(500);
        } else {
            console.log('Nessun overlay rilevato, procedo.');
        }

        // --- CONTROLLO POPUP DI BLOCCO (Solo se esplicitamente richiesto dai tool) ---
        if (checkForPopup) {
            const modal = page.locator('.modal-content');
            const isModalVisible = await modal.isVisible().catch(() => false);

            if (isModalVisible) {
                const modalText = (await modal.innerText()).trim().replace(/\n/g, ' ');
                console.warn(`[POPUP DETECTED] ${modalText}`);
                // Interrompiamo immediatamente il job riportando il messaggio del popup
                throw new Error(`POPUP_DETECTED: ${modalText}`);
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

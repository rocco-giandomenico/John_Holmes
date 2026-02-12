/**
 * Attende che l'overlay di caricamento della pagina (#overlay) scompaia.
 * Questo tool è fondamentale dopo aver inserito P.IVA o cambiato selezioni che 
 * scatenano ricalcoli asincroni nel form Fastweb.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {number} maxWaitTime - Tempo massimo di attesa totale in millisecondi (default 30s).
 */
async function waitForOverlay(page, maxWaitTime = 30000) {
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
    } catch (error) {
        console.warn('Timeout o errore durante l\'attesa dell\'overlay:', error.message);
    }
}

module.exports = {
    waitForOverlay
};

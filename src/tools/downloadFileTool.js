const path = require('path');
const fs = require('fs');
const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Gestisce il download di un file scatenato da un click.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore dell'elemento da cliccare per avviare il download.
 * @param {number} timeout - Tempo massimo di attesa per il download (default 60000ms).
 * @returns {Promise<{success: boolean, fileName?: string, filePath?: string, error?: string}>}
 */
async function downloadFile(page, locator, timeout = 60000) {
    const downloadPath = path.resolve(process.cwd(), 'files', 'downloads');

    try {
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
            console.log(`Cartella download creata: ${downloadPath}`);
        }

        let resultDownload;

        await withRetry(async () => {
            const element = page.locator(locator);
            await element.waitFor({ state: 'visible', timeout: 15000 });

            console.log(`Avvio download tramite click su: ${locator}`);

            // Aspettiamo l'evento di download mentre clicchiamo
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout }),
                element.click()
            ]);

            const fileName = download.suggestedFilename();
            const filePath = path.join(downloadPath, fileName);

            console.log(`Download intercettato: ${fileName}. Salvataggio in corso...`);

            await download.saveAs(filePath);
            console.log(`Download completato con successo: ${filePath}`);

            resultDownload = { success: true, fileName, filePath };

            // Attesa overlay post-click se presente
            await waitForOverlay(page, 60000, true);
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return resultDownload;
    } catch (error) {
        console.error(`Fallimento download per (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    downloadFile
};

const { waitForOverlay } = require('./waitForOverlayTool');
const { withRetry } = require('./retryTool');
const configLoader = require('../utils/configLoader');
const path = require('path');
const fs = require('fs');

/**
 * Carica uno o più file in un input di tipo file.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore dell'input file.
 * @param {string|string[]} filePath - Il percorso (o i percorsi) del file da caricare. Può essere assoluto o relativo alla root del progetto.
 * @param {number} timeout - Tempo massimo di attesa (default 15000ms).
 * @returns {Promise<{success: boolean, error?: string}>} - Esito dell'operazione.
 */
async function uploadFile(page, locator, filePath, timeout = 15000) {
    try {
        await withRetry(async () => {
            const input = page.locator(locator);

            // Per gli input file, Playwright consiglia di aspettare che siano presenti nel DOM (attached)
            await input.waitFor({ state: 'attached', timeout });

            // Gestione percorsi: risolviamo i percorsi se sono relativi
            const files = Array.isArray(filePath) ? filePath : [filePath];
            const absolutePaths = files.map(p => {
                const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
                if (!fs.existsSync(resolved)) {
                    throw new Error(`File non trovato: ${resolved}`);
                }
                return resolved;
            });

            console.log(`Caricamento file (${absolutePaths.join(', ')}) su: ${locator}`);

            // Imposta i file nell'input
            await input.setInputFiles(absolutePaths);

            // Spesso il caricamento scatta un overlay o una modale di attesa
            await waitForOverlay(page, 60000, true);

            // 4. Spostamento dei file nella cartella 'olds' dopo il successo
            const oldsDir = path.resolve(process.cwd(), 'olds');
            if (!fs.existsSync(oldsDir)) {
                fs.mkdirSync(oldsDir, { recursive: true });
                console.log(`Cartella creata: ${oldsDir}`);
            }

            for (const oldPath of absolutePaths) {
                const fileName = path.basename(oldPath);
                const newPath = path.join(oldsDir, fileName);

                try {
                    fs.renameSync(oldPath, newPath);
                    console.log(`File spostato con successo in 'olds': ${fileName}`);
                } catch (moveError) {
                    console.warn(`Impossibile spostare il file ${fileName}:`, moveError.message);
                    // Non blocchiamo il successo dell'upload se lo spostamento fallisce (es. file occupato)
                }
            }
        }, configLoader.get('TOOLS_RETRY', 2), 1000);

        return { success: true };
    } catch (error) {
        if (error.message.includes('POPUP_DETECTED')) {
            throw error;
        }
        console.error(`Fallimento upload per (${locator}):`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    uploadFile
};

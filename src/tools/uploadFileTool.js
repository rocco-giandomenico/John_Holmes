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
 * @param {string} pdaId - L'ID della PDA per organizzare i file spostati.
 * @param {number} timeout - Tempo massimo di attesa (default 15000ms).
 * @returns {Promise<{success: boolean, error?: string}>} - Esito dell'operazione.
 */
async function uploadFile(page, locator, filePath, pdaId, timeout = 15000, retries = null) {
    const finalRetries = retries !== null ? retries : configLoader.get('TOOLS_RETRY', 2);
    try {
        await withRetry(async () => {
            const input = page.locator(locator);

            // Per gli input file, Playwright consiglia di aspettare che siano presenti nel DOM (attached)
            await input.waitFor({ state: 'attached', timeout });

            // Gestione percorsi: risolviamo i percorsi se sono relativi e gestiamo wildcard
            const files = Array.isArray(filePath) ? filePath : [filePath];
            const absolutePaths = [];

            for (const p of files) {
                let resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);

                // Supporto wildcard (*)
                if (resolved.includes('*')) {
                    const dir = path.dirname(resolved);
                    const pattern = path.basename(resolved).replace(/\./g, '\\.').replace(/\*/g, '.*');
                    const regex = new RegExp(`^${pattern}$`, 'i');

                    if (fs.existsSync(dir)) {
                        const filesInDir = fs.readdirSync(dir);
                        const matchedFile = filesInDir.find(f => regex.test(f));
                        if (matchedFile) {
                            resolved = path.join(dir, matchedFile);
                            console.log(`Wildcard risolta: ${p} -> ${resolved}`);
                        } else {
                            throw new Error(`Nessun file trovato per il pattern: ${resolved}`);
                        }
                    } else {
                        throw new Error(`Directory non trovata per risoluzione wildcard: ${dir}`);
                    }
                }

                if (!fs.existsSync(resolved)) {
                    throw new Error(`File non trovato: ${resolved}`);
                }
                absolutePaths.push(resolved);
            }

            console.log(`Caricamento file (${absolutePaths.join(', ')}) su: ${locator}`);

            // Imposta i file nell'input
            await input.setInputFiles(absolutePaths);

            // Sposto i file in 'olds/{pdaId}' dopo l'upload
            const oldsDir = path.resolve(process.cwd(), 'files', 'olds', String(pdaId || 'unknown'));
            if (!fs.existsSync(oldsDir)) {
                fs.mkdirSync(oldsDir, { recursive: true });
                console.log(`Cartella creata: ${oldsDir}`);
            }

            // Spesso il caricamento scatta un overlay o una modale di attesa
            await waitForOverlay(page, 60000, true);

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
        }, finalRetries, 1000);

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

const express = require('express');
const browserManager = require('./browserManager');
const configLoader = require('./utils/configLoader');
const { generateInstructions } = require('../develop/logic');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = configLoader.get('PORT', 3000);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware di logging globale per debug
app.use((req, res, next) => {
    console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

/**
 * Helper per gestire le risposte di errore standardizzate.
 * Gestisce automaticamente il codice 409 se l'errore indica che il sistema è occupato.
 */
function sendErrorResponse(res, error, defaultStatus = 200) {
    const message = error.message || error;
    const isBusy = message.includes('BUSY') || message.includes('già in esecuzione');
    // Forziamo lo status a 200 come richiesto, mantenendo la distinzione nel log
    const status = isBusy ? 200 : 200;

    res.status(200).json({
        success: false,
        message: message
    });
}

/**
 * Endpoint per aprire il browser.
 * Body: { "url": "string" }
 */
app.post('/open-browser', async (req, res) => {
    try {
        const url = req.body.url;
        const targetUrl = await browserManager.open(url);
        res.status(200).json({
            success: true,
            message: `Browser aperto e navigazione completata.`,
            url: targetUrl
        });
    } catch (error) {
        sendErrorResponse(res, error, 400);
    }
});

/**
 * Endpoint per effettuare il login.
 * Body: { "username": "...", "password": "..." }
 */
app.post('/login', async (req, res) => {
    try {
        const config = configLoader.getConfig();
        const username = config.USERNAME;
        const password = config.PASSWORD;

        if (!username || !password) {
            throw new Error('Credenziali (USERNAME/PASSWORD) mancanti in config.json.');
        }

        const force = req.body.force === true || req.body.force === 'true';
        const result = await browserManager.login(username, password, force);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Login effettuato con successo.',
                url: result.url
            });
        } else {
            // Caso gestito (es. sessione concorrente) - Forza 200
            res.status(200).json({
                success: false,
                message: result.error || 'Login failed.',
                url: result.url
            });
        }
    } catch (error) {
        sendErrorResponse(res, error, 401);
    }
});

/**
 * Endpoint per il logout sicuro.
 * Naviga verso GlobalSearch e clicca su "Esci".
 * Body: { "force": boolean }
 */
app.post('/secure-logout', async (req, res) => {
    try {
        const force = req.body.force === true || req.body.force === 'true';
        const result = await browserManager.logout(force);
        res.status(200).json(result);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Endpoint per chiudere il browser.
 * Body: { "force": boolean } - Se true, forza la chiusura anche se loggato.
 */
app.post('/close-browser', async (req, res) => {
    try {
        const force = req.body.force === true || req.body.force === 'true';
        const result = await browserManager.close(force);

        if (result === 'mantained') {
            res.status(200).json({
                success: true,
                status: 'mantained',
                message: 'Il browser è rimasto aperto perché la sessione è attiva. Usa {"force": true} nel body per forzare la chiusura.'
            });
        } else {
            res.status(200).json({
                success: true,
                status: 'closed',
                message: 'Browser chiuso correttamente.'
            });
        }
    } catch (error) {
        sendErrorResponse(res, error, 400);
    }
});

/**
 * Endpoint per recuperare lo stato corrente della pagina (URL, Titolo).
 */
app.post('/current-page', async (req, res) => {
    try {
        const state = await browserManager.getCurrentState();
        res.status(200).json({
            success: true,
            ...state
        });
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Endpoint per gestire lo stato della sessione (Login/Logout).
 * Body (opzionale): { "logged": boolean }
 */
app.post('/api/session-status', (req, res) => {
    try {
        // Se viene passato 'logged' nel body, aggiorniamo lo stato
        if (req.body && req.body.logged !== undefined) {
            const logged = req.body.logged === true || req.body.logged === 'true';
            browserManager.setLoggedIn(logged);
        }

        // In ogni caso restituiamo lo stato attuale
        const isLoggedIn = browserManager.getLoggedInStatus();
        res.status(200).json({
            success: true,
            isLoggedIn: isLoggedIn,
            message: `Stato sessione: ${isLoggedIn ? 'LOGGED IN' : 'LOGGED OUT'}`
        });
    } catch (error) {
        sendErrorResponse(res, error, 400);
    }
});

/**
 * Endpoint per inizializzare la procedura PDA (Inserimento Ordine).
 * Body: { "force": boolean }
 */
app.post('/pda-init', async (req, res) => {
    try {
        const force = req.body.force === true || req.body.force === 'true';
        const result = await browserManager.initPDA(force);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Endpoint per avviare l'esecuzione di un Job (Sequenza di azioni).
 * Body: { "data": {...}, "pdaId": "..." }
 */
app.post('/execute-job', async (req, res) => {
    try {
        let data = req.body.data || req.body;

        if (!data || !data.actions) {
            throw new Error('Formato non valido. Invia un JSON con un array di "actions".');
        }

        const pdaIdReq = req.body.pdaId;
        const force = req.body.force === true || req.body.force === 'true';

        const pdaId = await browserManager.executeJob(data, pdaIdReq, force);
        res.status(200).json({
            success: true,
            pdaId: pdaId,
            message: 'Esecuzione Job (Sequenza) avviata in background.',
            statusUrl: `/job-status/${pdaId}`
        });
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Endpoint per generare le istruzioni partendo dai dati della pratica.
 * Utilizza la logica di mappatura definita in develop/logic.js.
 * Body: { ... } (Dati della pratica)
 */
app.post('/instructions', async (req, res) => {
    try {
        const data = req.body;
        const result = await generateInstructions(data);
        res.status(200).json(result);
    } catch (error) {
        sendErrorResponse(res, error, 400);
    }
});


/**
 * Endpoint per controllare lo stato di un job (POST).
 * Body: { "pdaId": "..." }
 */
app.post('/job-status', (req, res) => {
    const pdaId = req.body.pdaId || req.body.id;
    if (!pdaId) {
        return res.status(200).json({
            success: false,
            message: 'ID del job (pdaId) mancante nel body.'
        });
    }

    const job = browserManager.getJobStatus(pdaId);
    if (job) {
        res.status(200).json(job);
    } else {
        res.status(200).json({
            success: false,
            message: 'Job non trovato.'
        });
    }
});


/**
 * Endpoint per listare tutti i job (POST).
 */
app.post('/jobs', (req, res) => {
    const jobs = browserManager.getAllJobs();
    res.status(200).json(jobs);
});

/**
 * Endpoint per catturare uno screenshot della pagina.
 * Restituisce l'immagine in Base64.
 */
app.post('/page-screenshot', async (req, res) => {
    try {
        const base64Image = await browserManager.getScreenshot();
        res.status(200).json({
            success: true,
            image: base64Image,
            format: 'base64',
            message: 'Screenshot catturato con successo.'
        });
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Endpoint per recuperare l'intero codice HTML della pagina.
 */
app.post('/page-code', async (req, res) => {
    try {
        const htmlContent = await browserManager.getPageCode();
        res.status(200).json({
            success: true,
            code: htmlContent,
            message: 'Codice pagina recuperato con successo.'
        });
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Configurazione Multer per l'upload dei documenti.
 * Salva i file in files/currents e svuota la cartella prima del salvataggio.
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'files', 'currents');

        // Verifica ed eventuale creazione della cartella
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        } else {
            // Svuota la cartella prima di ogni nuovo upload "di gruppo"
            // Nota: multer chiama destination per ogni file, ma noi vogliamo svuotare solo all'inizio.
            // Per semplicità e sicurezza del requisito "tutti insieme", svuotiamo se rileviamo il primo file 
            // o gestiamo la pulizia in una funzione separata (più robusto).
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

/**
 * Endpoint per far scaricare al server i documenti da Kiop.
 * n8n passa solo i metadati e il token, il server scarica i file direttamente.
 * Body: { pdaId, accessToken, files: [{ id, name }] }
 */
app.post('/fetch-documents', async (req, res) => {
    const { pdaId, accessToken, files, clearFolder, jobTimestamp } = req.body;
    const uploadPath = path.join(process.cwd(), 'files', 'currents');

    if (!pdaId || !accessToken || !files || !Array.isArray(files)) {
        return res.status(200).json({ success: false, message: 'Parametri mancanti: pdaId, accessToken e files (array) sono richiesti.' });
    }

    try {
        // 1. Svuota la cartella SOLO se espressamente richiesto (per download in batch)
        if (clearFolder === true) {
            console.log(`[SERVER] Svuotamento cartella currents richiesto.`);
            if (fs.existsSync(uploadPath)) {
                const existingFiles = fs.readdirSync(uploadPath);
                for (const f of existingFiles) {
                    fs.unlinkSync(path.join(uploadPath, f));
                }
            }
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const savedFiles = [];
        const axios = require('axios'); // Assicuriamoci che sia disponibile

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const currentDateTime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const suffix = `_${currentDateTime}`;

        // 2. Download sequenziale dei file
        for (const fileItem of files) {
            console.log(`[SERVER] Inizio download file: ${fileItem.name} (ID: ${fileItem.id})`);

            const response = await axios({
                url: `https://pda.kiop.it/solida/api/pda/${pdaId}/file-entries/${fileItem.id}/download`,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                responseType: 'arraybuffer'
            });

            // Determine filename based on type (consistent with downloadKiopFiles)
            let fileName = fileItem.name;
            if (fileItem.type === 'Visura') {
                fileName = `${pdaId}_visura${suffix}.pdf`;
            } else if (fileItem.type === 'Documento di Identità') {
                fileName = `${pdaId}_id_card${suffix}.pdf`;
            } else if (fileItem.type === 'Altro') {
                fileName = `${pdaId}_pda${suffix}.pdf`;
            }

            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, Buffer.from(response.data));
            savedFiles.push(fileName);
            console.log(`[SERVER] File salvato: ${fileName}`);
        }

        res.status(200).json({
            success: true,
            message: `${savedFiles.length} file scaricati e salvati correttamente in files/currents.`,
            files: savedFiles
        });

    } catch (error) {
        console.error(`[SERVER] Errore durante il fetch dei documenti:`, error.message);
        sendErrorResponse(res, `Errore durante il fetch: ${error.message}`);
    }
});

/**
 * Endpoint per l'upload documenti.
 * Salva i dati ricevuti in develop/files.json.
 */
app.post('/upload-documents', async (req, res) => {
    try {
        const data = req.body;
        const filesJsonPath = path.join(process.cwd(), 'develop', 'files.json');

        fs.writeFileSync(filesJsonPath, JSON.stringify(data, null, 4), 'utf8');
        console.log(`[SERVER] Ricevuti dati upload salvati in: ${filesJsonPath}`);

        const { pdaId, files, jobTimestamp } = data;
        if (!pdaId || !files || !Array.isArray(files)) {
            return res.status(200).json({ success: false, message: 'Parametri mancanti: pdaId e files (array) sono richiesti.' });
        }

        const downloadKiopFiles = require('./procedures/downloadKiopFiles');
        const downloadResult = await downloadKiopFiles(pdaId, files, true);

        res.status(200).json({
            success: true,
            message: 'Dati salvati e file scaricati correttamente in files/currents',
            downloadedFiles: downloadResult.files
        });
    } catch (error) {
        console.error(`[SERVER] Errore critico nell'endpoint upload-documents:`, error);
        sendErrorResponse(res, error || 'Errore sconosciuto durante il processo');
    }
});

/**
 * Endpoint per ripulire la cartella logs.
 */
app.post('/clear-logs', (req, res) => {
    try {
        const logsPath = path.join(process.cwd(), 'logs');
        if (fs.existsSync(logsPath)) {
            const items = fs.readdirSync(logsPath);
            for (const item of items) {
                const fullPath = path.join(logsPath, item);
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    fs.unlinkSync(fullPath);
                } else if (stats.isDirectory()) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                }
            }
            console.log(`[SERVER] Cartella logs ripulita (${items.length} elementi rimossi).`);
            res.status(200).json({
                success: true,
                message: `Cartella logs ripulita correttamente. Rimossi ${items.length} elementi.`
            });
        } else {
            res.status(200).json({ success: true, message: 'Cartella logs non trovata, nulla da ripulire.' });
        }
    } catch (error) {
        console.error(`[SERVER] Errore pulizia log:`, error.message);
        sendErrorResponse(res, `Errore durante la pulizia dei log: ${error.message}`);
    }
});

/**
 * Endpoint per ripulire la cartella files/olds.
 */
app.post('/clear-olds', (req, res) => {
    try {
        const oldsPath = path.join(process.cwd(), 'files', 'olds');
        if (fs.existsSync(oldsPath)) {
            const items = fs.readdirSync(oldsPath);
            for (const item of items) {
                const fullPath = path.join(oldsPath, item);
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    fs.unlinkSync(fullPath);
                } else if (stats.isDirectory()) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                }
            }
            console.log(`[SERVER] Cartella files/olds ripulita (${items.length} elementi rimossi).`);
            res.status(200).json({
                success: true,
                message: `Cartella files/olds ripulita correttamente. Rimossi ${items.length} elementi.`
            });
        } else {
            res.status(200).json({ success: true, message: 'Cartella files/olds non trovata, nulla da ripulire.' });
        }
    } catch (error) {
        console.error(`[SERVER] Errore pulizia olds:`, error.message);
        sendErrorResponse(res, `Errore durante la pulizia di olds: ${error.message}`);
    }
});

/**
 * Endpoint per listare i file scaricati (POST).
 */
app.post('/list-downloads', (req, res) => {
    try {
        const downloadsPath = path.join(process.cwd(), 'files', 'downloads');
        if (fs.existsSync(downloadsPath)) {
            const files = fs.readdirSync(downloadsPath);
            res.status(200).json({
                success: true,
                files: files
            });
        } else {
            res.status(200).json({
                success: true,
                files: [],
                message: 'Cartella downloads non ancora creata.'
            });
        }
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

/**
 * Endpoint per scaricare un file specifico (POST).
 * Body: { "filename": "..." }
 */
app.post('/get-download', (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(200).json({ success: false, message: 'Filename mancante nel body.' });
        }

        // Protezione semplice contro directory traversal
        const safeFilename = path.basename(filename);
        const filePath = path.join(process.cwd(), 'files', 'downloads', safeFilename);

        if (fs.existsSync(filePath)) {
            // res.download forza il download con gli header corretti (Content-Disposition, ecc.)
            res.download(filePath, safeFilename, (err) => {
                if (err) {
                    console.error(`Errore durante invio file: ${err.message}`);
                    if (!res.headersSent) {
                        res.status(200).json({ success: false, message: 'Errore durante l\'invio del file.' });
                    }
                }
            });
        } else {
            res.status(200).json({
                success: false,
                message: `File '${safeFilename}' non trovato.`
            });
        }
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

app.listen(port, () => {
    console.log(`Server Playwright in ascolto su http://localhost:${port}`);
});

// Middleware globale per la gestione degli errori (assicura risposte JSON anche per crash imprevisti o errori del body-parser)
app.use((err, req, res, next) => {
    console.error(`[SERVER] Errore non gestito:`, err);

    // Se la risposta è già stata inviata, delega al gestore di default
    if (res.headersSent) {
        return next(err);
    }

    res.status(200).json({
        success: false,
        message: err.message || 'Errore interno del server'
    });
});

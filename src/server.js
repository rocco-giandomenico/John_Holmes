const express = require('express');
const browserManager = require('./browserManager');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let config = {};
try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (error) {
    console.error('Errore caricamento config.json nel server.');
}

const app = express();
const port = config.PORT || 3000;

app.use(express.json());

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
        console.error('Errore durante l\'apertura del browser:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Endpoint per effettuare il login.
 * Body: { "username": "...", "password": "..." }
 */
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username e Password sono obbligatori.'
            });
        }

        const result = await browserManager.login(username, password);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Login effettuato con successo.',
                url: result.url
            });
        } else {
            // Caso gestito (es. sessione concorrente)
            res.status(401).json({
                success: false,
                error: result.error || 'Login failed.',
                url: result.url
            });
        }
    } catch (error) {
        console.error('Errore durante il login:', error);
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Endpoint per il logout sicuro.
 * Naviga verso GlobalSearch e clicca su "Esci".
 */
app.post('/secure-logout', async (req, res) => {
    try {
        const result = await browserManager.logout();
        res.status(200).json(result);
    } catch (error) {
        console.error('Errore durante il logout sicuro:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
        console.error('Errore durante la chiusura del browser:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
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
        console.error('Errore durante il recupero dello stato della pagina:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Endpoint per inizializzare la procedura PDA (Inserimento Ordine).
 */
app.post('/pda-init', async (req, res) => {
    try {
        const result = await browserManager.initPDA();
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Errore durante initPDA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Endpoint per avviare l'inserimento PDA come Job.
 * Body: { "data": {...} } (Opzionale, altrimenti usa pda_data.json)
 */
app.post('/insert-pda', async (req, res) => {
    try {
        let data = req.body.data || req.body; // Accetta sia {data: {actions}} che direttamente {actions}

        if (!data || !data.actions) {
            // Se non ci sono azioni nel body, proviamo a caricare un file di default (se esiste un pda_sequence.json)
            // o restituiamo un errore spiegando il nuovo formato.
            const pdaSequencePath = path.join(__dirname, '..', 'stuff', 'pda_sequence.json');
            if (fs.existsSync(pdaSequencePath)) {
                data = JSON.parse(fs.readFileSync(pdaSequencePath, 'utf8'));
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Formato non valido. Invia un JSON con un array di "actions".',
                    example: {
                        pdaId: "mio-id-personalizzato",
                        actions: [
                            { type: "open_accordion", name: "Dati Anagrafici" },
                            { type: "fill", locator: "input...", value: "valore" },
                            { type: "wait", value: 2000 }
                        ]
                    }
                });
            }
        }

        const pdaIdReq = req.body.pdaId;
        const pdaId = await browserManager.insertPDA(data, pdaIdReq);
        res.status(202).json({
            success: true,
            pdaId: pdaId,
            message: 'Inserimento PDA (Sequenza) avviato in background.',
            statusUrl: `/job-status/${pdaId}`
        });
    } catch (error) {
        console.error('Errore durante avvio insert-pda:', error);
        res.status(error.message.includes('già in esecuzione') ? 409 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Endpoint per controllare lo stato di un job.
 */
app.get('/job-status/:id', (req, res) => {
    const pdaId = req.params.id;
    const job = browserManager.getJobStatus(pdaId);
    if (job) {
        res.status(200).json(job);
    } else {
        res.status(404).json({
            success: false,
            error: 'PDA Job non trovato.'
        });
    }
});

/**
 * Endpoint per listare tutti i job.
 */
app.get('/jobs', (req, res) => {
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
        console.error('Errore durante la cattura dello screenshot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
        console.error('Errore durante il recupero del codice pagina:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server Playwright in ascolto su http://localhost:${port}`);
});

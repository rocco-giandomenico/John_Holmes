const express = require('express');
const browserManager = require('./browserManager');
const configLoader = require('./utils/configLoader');

const app = express();
const port = configLoader.get('PORT', 3000);

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
        const config = configLoader.getConfig();
        const username = config.USERNAME;
        const password = config.PASSWORD;

        if (!username || !password) {
            return res.status(500).json({
                success: false,
                error: 'Credenziali (USERNAME/PASSWORD) mancanti in config.json.'
            });
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
            // Caso gestito (es. sessione concorrente)
            res.status(401).json({
                success: false,
                error: result.error || 'Login failed.',
                url: result.url
            });
        }
    } catch (error) {
        console.error('Errore durante il login:', error);
        const isBusy = error.message.includes('BUSY');
        res.status(isBusy ? 409 : 401).json({
            success: false,
            error: error.message
        });
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
        console.error('Errore durante il logout sicuro:', error);
        const isBusy = error.message.includes('BUSY');
        res.status(isBusy ? 409 : 500).json({
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
 * Body: { "force": boolean }
 */
app.post('/pda-init', async (req, res) => {
    try {
        const force = req.body.force === true || req.body.force === 'true';
        const result = await browserManager.initPDA(force);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Errore durante initPDA:', error);
        const isBusy = error.message.includes('BUSY');
        res.status(isBusy ? 409 : 500).json({
            success: false,
            error: error.message
        });
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
            return res.status(400).json({
                success: false,
                error: 'Formato non valido. Invia un JSON con un array di "actions".'
            });
        }

        const pdaIdReq = req.body.pdaId;
        const force = req.body.force === true || req.body.force === 'true';

        const pdaId = await browserManager.executeJob(data, pdaIdReq, force);
        res.status(202).json({
            success: true,
            pdaId: pdaId,
            message: 'Esecuzione Job (Sequenza) avviata in background.',
            statusUrl: `/job-status/${pdaId}`
        });
    } catch (error) {
        console.error('Errore durante avvio execute-job:', error);
        // Restituisci 409 Conflict se il sistema è occupato o il job esiste già
        const isBusy = error.message.includes('BUSY') || error.message.includes('già in esecuzione');
        res.status(isBusy ? 409 : 500).json({
            success: false,
            error: error.message
        });
    }
});


/**
 * Endpoint per controllare lo stato di un job (POST).
 * Body: { "pdaId": "..." }
 */
app.post('/job-status', (req, res) => {
    const pdaId = req.body.pdaId || req.body.id;
    if (!pdaId) {
        return res.status(400).json({
            success: false,
            error: 'ID del job (pdaId) mancante nel body.'
        });
    }

    const job = browserManager.getJobStatus(pdaId);
    if (job) {
        res.status(200).json(job);
    } else {
        res.status(404).json({
            success: false,
            error: 'Job non trovato.'
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

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








app.listen(port, () => {
    console.log(`Server Playwright in ascolto su http://localhost:${port}`);
});

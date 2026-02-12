const fs = require('fs');
const path = require('path');

// Import procedure modules
const openProcedure = require('./procedures/open');
const loginProcedure = require('./procedures/login');
const logoutProcedure = require('./procedures/logout');
const initPDAProcedure = require('./procedures/initPDA');
const getCurrentStateProcedure = require('./procedures/getCurrentState');
const closeProcedure = require('./procedures/close');
const getPageScreenshotProcedure = require('./procedures/getPageScreenshot');
const getPageCodeProcedure = require('./procedures/getPageCode');
const insertPDAProcedure = require('./procedures/insertPDA');



const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const STATE_FILE = path.join(__dirname, '..', 'session_state.json');

let config = {};
try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (error) {
    console.error('Errore caricamento config.json, uso fallback.');
}

const DEFAULT_URL = config.FASTWEB_DEFAULT_URL || 'https://logon.fastweb.it/oam/server/obrareq.cgi';




class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.jobs = {}; // Mantiene lo stato dei job in background
    }

    /**
     * Avvia un job in background.
     * @param {string} type - Tipo di procedura (es. 'insert-pda').
     * @param {Function} taskFn - Funzione async che esegue il lavoro.
     * @param {string} [customId] - ID opzionale (pdaId) fornito dall'utente.
     * @returns {string} pdaId creato.
     */
    startJob(type, taskFn, customId) {
        let pdaId = customId || `${type}_${Date.now()}`;

        if (this.jobs[pdaId] && this.jobs[pdaId].status === 'running') {
            throw new Error(`Un job con ID '${pdaId}' è già in esecuzione.`);
        }

        this.jobs[pdaId] = {
            id: pdaId,
            type: type,
            status: 'running',
            progress: 0,
            lastAction: 'Avvio procedura...',
            startTime: new Date().toISOString(),
            endTime: null,
            result: null,
            error: null
        };

        // Esegue in background senza attendere
        taskFn(pdaId, (progress, lastAction) => {
            this.updateJob(pdaId, { progress, lastAction });
        }).then(result => {
            this.updateJob(pdaId, { status: 'completed', progress: 100, result, endTime: new Date().toISOString() });
        }).catch(error => {
            console.error(`Job ${pdaId} fallito:`, error);
            this.updateJob(pdaId, { status: 'failed', error: error.message, endTime: new Date().toISOString() });
        });

        return pdaId;
    }

    updateJob(pdaId, data) {
        if (this.jobs[pdaId]) {
            this.jobs[pdaId] = { ...this.jobs[pdaId], ...data };
        }
    }

    getJobStatus(pdaId) {
        return this.jobs[pdaId] || null;
    }

    getAllJobs() {
        return Object.values(this.jobs);
    }

    /**
     * Apre il browser e naviga verso l'URL specificato.
     * Delega la logica alla procedura esterna e mantiene lo stato del singleton.
     * 
     * @param {string} url - L'indirizzo web da aprire (default da config).
     * @returns {Promise<string>} - L'URL finale dove si trova il browser.
     */
    async open(url = DEFAULT_URL) {
        // Reset dello stato di login su ogni nuova apertura/navigazione forzata
        this.setLoggedIn(false);

        // Chiama la procedura modularizzata passando lo stato attuale
        const result = await openProcedure(url, this.browser, this.page);

        // Se la procedura ha creato nuove istanze (browser non era già aperto),
        // aggiorna i riferimenti interni del singleton.
        if (result.browser) {
            this.browser = result.browser;
            this.context = result.context;
            this.page = result.page;
        }

        return result.url;
    }

    /**
     * Esegue la procedura di login delegando al modulo esterno.
     * Se il browser non è aperto, lo apre automaticamente prima di procedere.
     * 
     * @param {string} username - Credenziali utente.
     * @param {string} password - Credenziali utente.
     * @returns {Promise<Object>} Risultato dell'operazione di login.
     */
    async login(username, password) {
        if (!this.page) {
            await this.open();
        }
        // Delega la logica alla procedura esterna, passando il contesto della pagina e la callback di stato
        return await loginProcedure(this.page, username, password, this.setLoggedIn.bind(this));
    }

    /**
     * Esegue il logout sicuro dal portale Fastweb.
     * Naviga verso SalesForce e clicca sul pulsante 'Esci'.
     * 
     * @returns {Promise<Object>} Esito dell'operazione.
     * @throws {Error} Se non c'è una pagina attiva su cui operare.
     */
    async logout() {
        if (!this.page) {
            throw new Error('No active page to logout from.');
        }
        // Delega la logica alla procedura esterna
        return await logoutProcedure(this.page, this.setLoggedIn.bind(this));
    }

    /**
     * Inizializza una nuova Proposta di Abbonamento (PDA).
     * Naviga verso la procedura di inserimento ordine e seleziona il codice prodotto.
     * 
     * @returns {Promise<Object>} Esito dell'operazione e URL raggiunto.
     * @throws {Error} Se il browser non è aperto o l'utente non è loggato.
     */
    async initPDA() {
        if (!this.page) {
            throw new Error('Browser not open or page not available. Please login first.');
        }
        // Delega la logica alla procedura esterna
        return await initPDAProcedure(this.page);
    }

    /**
     * Avvia il job di inserimento dati PDA.
     * @param {Object} data - Dati da inserire.
     * @param {string} [pdaId] - ID personalizzato.
     * @returns {string} pdaId.
     */
    async insertPDA(data, pdaId) {
        if (!this.page) {
            throw new Error('Browser not open or page not available.');
        }

        return this.startJob('insert-pda', async (id, updateStatus) => {
            return await insertPDAProcedure(this.page, data, updateStatus);
        }, pdaId);
    }

    /**
     * Restituisce lo stato attuale della sessione browser.
     * 
     * @returns {Promise<Object>} Oggetto contenente lo stato di apertura, URL e titolo.
     */
    async getCurrentState() {
        return await getCurrentStateProcedure(this.browser, this.page);
    }

    /**
     * Cattura uno screenshot della pagina corrente.
     * 
     * @returns {Promise<string>} Screenshot in formato Base64.
     */
    async getScreenshot() {
        return await getPageScreenshotProcedure(this.page);
    }

    /**
     * Recupera il codice HTML della pagina corrente.
     * 
     * @returns {Promise<string>} Contenuto HTML.
     */
    async getPageCode() {
        return await getPageCodeProcedure(this.page);
    }

    /**
     * Chiude il browser rispettando le direttive di persistenza della sessione.
     * 
     * @param {boolean} force - Se true, ignora lo stato della sessione e chiude comunque.
     * @returns {Promise<string>} Esito della chiusura ('closed' o 'mantained').
     */
    async close(force = false) {
        const isLoggedIn = this.getLoggedInStatus();
        const result = await closeProcedure(this.browser, force, isLoggedIn);

        if (result === 'closed') {
            this.browser = null;
            this.context = null;
            this.page = null;
        }

        return result;
    }

    getLoggedInStatus() {
        const state = this._readState();
        return !!state.isLoggedIn;
    }

    setLoggedIn(status) {
        this._writeState({
            isLoggedIn: !!status,
            lastLogin: status ? new Date().toISOString() : null
        });
        console.log(`Stato login aggiornato: ${status}`);
    }

    _readState() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            }
        } catch (error) {
            console.error('Errore lettura stato:', error);
        }
        return { isLoggedIn: false, lastLogin: null };
    }

    _writeState(state) {
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        } catch (error) {
            console.error('Errore scrittura stato:', error);
        }
    }

}



module.exports = new BrowserManager();

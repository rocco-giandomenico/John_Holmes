const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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
    }

    async open(url = DEFAULT_URL) {
        // Reset login state on ogni apertura
        this.setLoggedIn(false);

        if (this.browser) {
            console.log(`Browser già aperto. Navigazione a ${url}...`);
            await this.page.goto(url);
            return url;
        }

        console.log('Avvio del browser...');
        this.browser = await chromium.launch({
            headless: false,
            args: ['--start-maximized']
        });

        this.context = await this.browser.newContext({ viewport: null });
        this.page = await this.context.newPage();

        console.log(`Navigazione a ${url}...`);
        await this.page.goto(url);
        return url;
    }

    async login(username, password) {
        if (!this.page) {
            await this.open();
        }

        let currentUrl = this.page.url();
        const intermediateURL = 'https://logon.fastweb.it/fwsso/landing.jsp?end_url=https%3A%2F%2Flogon.fastweb.it%2Fpartner';
        const finalTargetURL = 'https://fastweb01.my.site.com/partnersales/apex/GlobalSearch?sfdc.tabName=01rw0000000kLSX';

        // 1. Controllo se siamo già loggati o sulla pagina finale
        if (currentUrl.includes('GlobalSearch')) {
            console.log('Già su GlobalSearch. Sessione attiva.');
            this.setLoggedIn(true);
            return { success: true, url: currentUrl };
        }

        console.log('Tentativo di inserimento credenziali...');
        try {
            // Aspetto il campo username per un tempo breve (5s)
            await this.page.waitForSelector('#username', { timeout: 5000 });

            await this.page.fill('#username', username);
            await this.page.fill('#password', password);

            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
                this.page.click('button.accesso')
            ]);
        } catch (error) {
            console.log('Timeout o errore durante l\'inserimento (possibile login manuale o sessione già avviata).');
        }

        currentUrl = this.page.url();
        console.log(`URL attuale dopo azione di login: ${currentUrl}`);

        // 2. Gestione percorso intermedio
        if (currentUrl.includes(intermediateURL)) {
            console.log('Raggiunta pagina intermedia, navigazione verso GlobalSearch...');
            await this.page.goto(finalTargetURL, { waitUntil: 'networkidle' });
            currentUrl = this.page.url();
        }

        // 3. Verifica finale
        const isConcurrentSession = currentUrl.includes('sparkID=ConcurrentSessions');
        const success = currentUrl.includes('GlobalSearch') && !isConcurrentSession;

        if (isConcurrentSession) {
            console.error('Login fallito: Sessione concorrente rilevata.');
            this.setLoggedIn(false);
            return {
                success: false,
                error: 'Concurrent Session Detected',
                url: currentUrl
            };
        } else if (success) {
            console.log('Login confermato (GlobalSearch raggiunta).');
            this.setLoggedIn(true);
            return { success: true, url: currentUrl };
        } else {
            console.error(`Login fallito. URL finale: ${currentUrl}`);
            this.setLoggedIn(false);
            throw new Error('Login failed. GlobalSearch destination not reached.');
        }

        return { success, url: currentUrl };
    }

    async logout() {
        if (!this.page) {
            throw new Error('No active page to logout from.');
        }

        const logoutSuccessURL = 'https://logon.fastweb.it/fwsso/pages/Logout.jsp';
        let currentUrl = this.page.url();

        // 0. Se siamo già sulla pagina di logout, segniamo come successo
        if (currentUrl.includes(logoutSuccessURL)) {
            console.log('Già sulla pagina di logout. Aggiornamento stato.');
            this.setLoggedIn(false);
            return { success: true, message: 'Già disconnesso.' };
        }

        const logoutRedirectURL = 'https://fastweb01.my.site.com/partnersales/apex/GlobalSearch?sfdc.tabName=01rw0000000kLSX';

        console.log('Avvio procedura di logout sicuro...');

        // 1. Vai alla pagina GlobalSearch
        console.log('Navigazione verso GlobalSearch per il logout...');
        await this.page.goto(logoutRedirectURL, { waitUntil: 'networkidle' });

        // 2. Clicca su NOCOMPANY (User Navigation)
        console.log('Apertura menu utente (#userNavLabel)...');
        await this.page.waitForSelector('#userNavLabel', { timeout: 10000 });
        await this.page.click('#userNavLabel');

        // 3. Clicca su Esci
        console.log('Click su Esci...');
        await this.page.waitForSelector('a[title="Esci"]', { timeout: 5000 });

        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
            this.page.click('a[title="Esci"]')
        ]);

        const finalUrl = this.page.url();
        const success = finalUrl.includes(logoutSuccessURL);

        if (success) {
            console.log('Logout confermato (URL di logout raggiunto).');
            this.setLoggedIn(false);
            return { success: true, message: 'Logout effettuato con successo.' };
        } else {
            console.error(`Logout non confermato. URL attuale: ${finalUrl}`);
            throw new Error('Logout failed. Success landing page not reached.');
        }
    }

    async getCurrentState() {
        if (!this.browser) {
            return {
                browserOpen: false,
                url: null,
                title: null
            };
        }

        try {
            const url = this.page.url();
            const title = await this.page.title();
            return {
                browserOpen: true,
                url,
                title
            };
        } catch (error) {
            console.error('Errore durante il recupero dello stato della pagina:', error);
            return {
                browserOpen: true,
                error: error.message
            };
        }
    }

    async close(force = false) {
        if (!this.browser) {
            throw new Error('No browser is currently open.');
        }

        const state = this._readState();
        if (!force && state.isLoggedIn) {
            console.log('Browser mantenuto aperto come da direttiva (sessione attiva).');
            return 'mantained';
        }

        console.log('Chiusura del browser...');
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        return 'closed';
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

    async initPDA() {
        if (!this.page) {
            throw new Error('Browser not open or page not available. Please login first.');
        }

        const pdaUrl = 'https://fastweb01.my.site.com/partnersales/apex/GlobalSearch?sfdc.tabName=01rw0000000kLSX';

        console.log('Navigazione verso pagina PDA...');
        await this.page.goto(pdaUrl, { waitUntil: 'networkidle' });

        // 1. Clicca su 'Inserisci Ordine'
        console.log('Cerco bottone "Inserisci Ordine"...');
        const inserisciOrdineBtn = this.page.locator('text=Inserisci Ordine');
        await inserisciOrdineBtn.waitFor({ state: 'visible', timeout: 10000 });
        await inserisciOrdineBtn.click();

        // 2. Clicca su 'IS.0228.0601NA'
        console.log('Cerco opzione "IS.0228.0601NA"...');
        const isCodeBtn = this.page.locator('text=IS.0228.0601NA');
        await isCodeBtn.waitFor({ state: 'visible', timeout: 10000 });
        await isCodeBtn.click();

        // 3. Verifica successo: 'Dati Anagrafici'
        console.log('Attendo sezione "Dati Anagrafici"...');
        const datiAnagraficiSection = this.page.locator('text=Dati Anagrafici');

        try {
            await datiAnagraficiSection.waitFor({ state: 'visible', timeout: 15000 });
            console.log('Sezione "Dati Anagrafici" trovata. Successo.');
            return {
                success: true,
                message: 'PDA Initialized successfully (Dati Anagrafici reached).',
                url: this.page.url()
            };
        } catch (error) {
            console.error('Sezione "Dati Anagrafici" NON trovata.');
            return {
                success: false,
                message: 'PDA flow failed. "Dati Anagrafici" section not found.',
                url: this.page.url()
            };
        }
    }

}



module.exports = new BrowserManager();

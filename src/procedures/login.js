/**
 * Procedura di login per il portale Fastweb.
 * Gestisce l'inserimento credenziali, i reindirizzamenti intermedi e la rilevazione di sessioni concorrenti.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright su cui operare.
 * @param {string} username - Lo username per l'accesso.
 * @param {string} password - La password per l'accesso.
 * @param {Function} setLoggedIn - Callback per aggiornare lo stato di login nel manager.
 * @returns {Promise<{success: boolean, url: string, error?: string}>}
 */
async function login(page, username, password, setLoggedIn) {
    let currentUrl = page.url();
    // Endpoint e target definiti per il flusso Fastweb
    const intermediateURL = 'https://logon.fastweb.it/fwsso/landing.jsp?end_url=https%3A%2F%2Flogon.fastweb.it%2Fpartner';
    const finalTargetURL = 'https://fastweb01.my.site.com/partnersales/apex/GlobalSearch?sfdc.tabName=01rw0000000kLSX';

    // 1. Controllo preliminare: se siamo già loggati o sulla pagina finale, non facciamo nulla
    if (currentUrl.includes('GlobalSearch')) {
        console.log('Già su GlobalSearch. Sessione attiva.');
        setLoggedIn(true);
        return { success: true, url: currentUrl };
    }

    console.log('Tentativo di inserimento credenziali...');
    try {
        // Attende che i campi di input siano disponibili (timeout breve per efficienza)
        await page.waitForSelector('#username', { timeout: 5000 });

        // Inserimento credenziali
        await page.fill('#username', username);
        await page.fill('#password', password);

        // Click sul pulsante di accesso e attesa della navigazione
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
            page.click('button.accesso')
        ]);
    } catch (error) {
        // Se non troviamo i campi, potremmo essere già loggati o in una pagina diversa
        console.log('Timeout o errore durante l\'inserimento (possibile login manuale o sessione già avviata).');
    }

    currentUrl = page.url();
    console.log(`URL attuale dopo azione di login: ${currentUrl}`);

    // 2. Gestione del percorso intermedio (fwsso landing)
    if (currentUrl.includes(intermediateURL)) {
        console.log('Raggiunta pagina intermedia, navigazione verso GlobalSearch...');
        await page.goto(finalTargetURL, { waitUntil: 'networkidle' });
        currentUrl = page.url();
    }

    // 3. Verifica finale del risultato
    const isConcurrentSession = currentUrl.includes('sparkID=ConcurrentSessions');
    const success = currentUrl.includes('GlobalSearch') && !isConcurrentSession;

    if (isConcurrentSession) {
        // Gestione caso specifico di sessione già attiva altrove
        console.error('Login fallito: Sessione concorrente rilevata.');
        setLoggedIn(false);
        return {
            success: false,
            error: 'Concurrent Session Detected',
            url: currentUrl
        };
    } else if (success) {
        // Login confermato
        console.log('Login confermato (GlobalSearch raggiunta).');
        setLoggedIn(true);
        return { success: true, url: currentUrl };
    } else {
        // Fallimento generico
        console.error(`Login fallito. URL finale: ${currentUrl}`);
        setLoggedIn(false);
        throw new Error('Login failed. GlobalSearch destination not reached.');
    }
}

module.exports = login;

const { withRetry } = require('../tools/retryTool');
const configLoader = require('../utils/configLoader');

/**
 * Procedura di logout per il portale Fastweb.
 * Esegue una disconnessione sicura navigando verso GlobalSearch e interagendo con il menu utente.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright su cui operare.
 * @param {Function} setLoggedIn - Callback per aggiornare lo stato di login nel manager.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function logout(page, setLoggedIn) {
    // URL che conferma l'avvenuto logout
    const logoutSuccessURL = 'https://logon.fastweb.it/fwsso/pages/Logout.jsp';
    let currentUrl = page.url();

    // 0. Verifica preliminare: se siamo già sulla pagina di logout, non facciamo nulla
    if (currentUrl.includes(logoutSuccessURL)) {
        console.log('Già sulla pagina di logout. Aggiornamento stato.');
        setLoggedIn(false);
        return { success: true, message: 'Già disconnesso.' };
    }

    // URL di base per iniziare la procedura di logout (Salesforce GlobalSearch)
    const logoutRedirectURL = 'https://fastweb01.my.site.com/partnersales/apex/GlobalSearch?sfdc.tabName=01rw0000000kLSX';

    const retries = configLoader.get('TOOLS_RETRY', 2);

    try {
        await withRetry(async () => {
            // 1. Forza la navigazione verso GlobalSearch per assicurarsi che il menu utente sia presente
            console.log('Navigazione verso GlobalSearch per il logout...');
            await page.goto(logoutRedirectURL, { waitUntil: 'networkidle', timeout: 30000 });

            // 2. Interazione con il menu utente (Salesforce User Navigation Label)
            console.log('Apertura menu utente (#userNavLabel)...');
            await page.waitForSelector('#userNavLabel', { timeout: 10000 });
            await page.click('#userNavLabel');

            // 3. Click sul link di logout ("Esci")
            console.log('Click su Esci...');
            await page.waitForSelector('a[title="Esci"]', { timeout: 5000 });

            // Attesa del completamento della navigazione dopo il click
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
                page.click('a[title="Esci"]')
            ]);
        }, retries, 2000);
    } catch (error) {
        console.error(`Errore durante la sequenza di logout dopo i retry: ${error.message}`);
    }

    // 4. Verifica finale dell'URL di atterraggio
    const finalUrl = page.url();
    console.log(`Verifico logout. URL finale rilevato: ${finalUrl}`);

    // Il logout può atterrare su logon.fastweb.it o direttamente su Salesforce secur/logout.jsp
    const success = finalUrl.toLowerCase().includes('pages/logout.jsp') ||
        finalUrl.toLowerCase().includes('secur/logout.jsp');

    if (success) {
        console.log('Logout confermato (URL di logout raggiunto).');
        setLoggedIn(false);
        return { success: true, message: 'Logout effettuato con successo.' };
    } else {
        // Se non raggiungiamo la pagina prevista, il logout potrebbe non essere andato a buon fine
        console.error(`Logout non confermato. URL attuale: ${finalUrl}`);
        return {
            success: false,
            error: `Logout failed. Success landing page not reached. Detected URL: ${finalUrl}`,
            url: finalUrl
        };
    }
}

module.exports = logout;

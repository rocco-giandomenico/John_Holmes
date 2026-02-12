/**
 * Procedura per la chiusura del browser.
 * Rispetta lo stato della sessione a meno che non venga forzata la chiusura.
 * 
 * @param {import('playwright').Browser|null} browser - L'istanza del browser.
 * @param {boolean} force - Se true, forza la chiusura anche se loggati.
 * @param {boolean} isLoggedIn - Stato attuale del login.
 * @returns {Promise<string>} - 'closed' se chiuso, 'mantained' se rimasto aperto.
 */
async function close(browser, force, isLoggedIn) {
    if (!browser) {
        throw new Error('No browser is currently open.');
    }

    // Se non è forzato e l'utente è loggato, manteniamo il browser aperto
    // secondo le direttive di progetto (Persistent Sessions).
    if (!force && isLoggedIn) {
        console.log('Browser mantenuto aperto come da direttiva (sessione attiva).');
        return 'mantained';
    }

    console.log('Chiusura del browser...');
    await browser.close();
    return 'closed';
}

module.exports = close;

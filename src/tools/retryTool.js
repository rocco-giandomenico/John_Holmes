/**
 * Esegue una funzione asincrona con un numero massimo di tentativi.
 * 
 * @param {Function} fn - La funzione asincrona da eseguire.
 * @param {number} retries - Numero di tentativi extra in caso di fallimento (default 2).
 * @param {number} delay - Ritardo iniziale tra i tentativi in ms (default 1000).
 * @returns {Promise<any>}
 */
async function withRetry(fn, retries = 2, delay = 1000) {
    let lastError;

    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Se l'errore è un POPUP_DETECTED, interrompiamo immediatamente i retry
            if (error.message.includes('POPUP_DETECTED')) {
                console.warn(`[RETRY ABORT] Errore critico rilevato: ${error.message}. Interruzione tentativi.`);
                throw error;
            }

            if (i < retries) {
                console.warn(`Tentativo ${i + 1} fallito. Riprovo tra ${delay}ms... (Errore: ${error.message})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                // Aumentiamo il ritardo per il prossimo tentativo (exponential backoff)
                delay *= 2;
            }
        }
    }

    throw lastError;
}

module.exports = { withRetry };

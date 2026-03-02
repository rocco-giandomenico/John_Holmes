const axios = require('axios');

// Configurazione Retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Helper per trasformare un oggetto in stringa x-www-form-urlencoded
 */
function encodeFormData(data) {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
}

/**
 * Funzione helper per eseguire richieste con retry
 */
async function requestWithRetry(config, retries = MAX_RETRIES) {
    try {
        return await axios(config);
    } catch (err) {
        const shouldRetry = retries > 0 && (!err.response || err.response.status >= 500 || err.response.status === 429);
        if (shouldRetry) {
            await new Promise(res => setTimeout(res, RETRY_DELAY));
            return await requestWithRetry(config, retries - 1);
        }
        throw err;
    }
}

// --- LOGICA PRINCIPALE (Equivalente nodi auth1 e retrive PDA1) ---

const authUrl = 'https://account.kiop.it/realms/maxel/protocol/openid-connect/token';
const authPayload = encodeFormData({
    grant_type: 'password',
    client_id: 'kiop-pda-dev',
    client_secret: 'd52f874a-4f99-4a16-ba94-c1fece71079a',
    username: 'superad@ivert.it',
    password: 'Super!AdS0p3r4d0!',
    scope: 'openid offline_access'
});

try {
    // 1. Esecuzione logica nodo "auth1"
    const authResponse = await requestWithRetry({
        url: authUrl,
        method: 'POST',
        data: authPayload,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = authResponse.data.access_token;
    const results = [];

    // 2. Ciclo sugli Item (Esecuzione logica nodo "retrive PDA1")
    for (const item of $input.all()) {
        const idPda = item.json["Id PDA"];
        if (!idPda) continue;

        try {
            // 3. Esecuzione logica nodo "retrive PDA1"
            const pdaResponse = await requestWithRetry({
                url: `https://pda.kiop.it/solida/api/pda/${idPda}`,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const pdaData = pdaResponse.data;
            let commonFileEntries = pdaData.commonFileEntries || [];

            // Filtriamo per tipo
            const visure = commonFileEntries.filter(f => f.type === 'Visura');
            const documentiIdentita = commonFileEntries.filter(f => f.type === 'Documento di Identità');

            // Validazione: Deve essercene esattamente uno per tipo
            if (visure.length !== 1 || documentiIdentita.length !== 1) {
                let errorMsg = [];
                if (visure.length === 0) errorMsg.push("Visura mancante");
                if (visure.length > 1) errorMsg.push(`Multiple Visure trovate (${visure.length})`);
                if (documentiIdentita.length === 0) errorMsg.push("Documento di Identità mancante");
                if (documentiIdentita.length > 1) errorMsg.push(`Molteplicità di Documenti di Identità trovati (${documentiIdentita.length})`);

                throw new Error(`Validazione documenti fallita: ${errorMsg.join(" - ")}`);
            }

            // Se la validazione passa, teniamo solo questi due elementi nel JSON finale
            pdaData.commonFileEntries = [visure[0], documentiIdentita[0]];

            results.push({
                json: {
                    ...pdaData,
                    additional_parameters: item.json
                }
            });

        } catch (err) {
            results.push({
                json: {
                    error: err.message,
                    id: idPda,
                    additional_parameters: item.json
                }
            });
        }
    }

    return results;

} catch (error) {
    return [{ json: { error: "Auth Fallita", details: error.message } }];
}
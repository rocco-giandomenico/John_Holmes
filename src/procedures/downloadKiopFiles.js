const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
async function requestWithRetry(config, retries = 3) {
    try {
        return await axios(config);
    } catch (err) {
        const shouldRetry = retries > 0 && (!err.response || err.response.status >= 500 || err.response.status === 429);
        if (shouldRetry) {
            await new Promise(res => setTimeout(res, 1000));
            return await requestWithRetry(config, retries - 1);
        }
        throw err;
    }
}

/**
 * Procedura per scaricare i file da Kiop.
 * Esegue l'autenticazione e scarica i file forniti in files/currents.
 * 
 * @param {string} pdaId - L'ID della PDA.
 * @param {Array} files - Lista di file da scaricare [{ id, name }].
 * @param {boolean} [clearFolder=true] - Se svuotare la cartella prima del download.
 * @returns {Promise<{success: boolean, files: string[]}>}
 */
async function downloadKiopFiles(pdaId, files, clearFolder = true) {
    const uploadPath = path.join(process.cwd(), 'files', 'currents');

    if (!Array.isArray(files) || files.length === 0) {
        throw new Error('Nessun file fornito per il download.');
    }

    try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const currentDateTime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const suffix = `_${currentDateTime}`;
        // 1. Autenticazione (Logica da test.js)
        console.log(`[DOWNLOAD] Richiesta token per procedere...`);
        const authUrl = 'https://account.kiop.it/realms/maxel/protocol/openid-connect/token';
        const authPayload = encodeFormData({
            grant_type: 'password',
            client_id: 'kiop-pda-dev',
            client_secret: 'd52f874a-4f99-4a16-ba94-c1fece71079a',
            username: 'superad@ivert.it',
            password: 'Super!AdS0p3r4d0!',
            scope: 'openid offline_access'
        });

        const authResponse = await requestWithRetry({
            url: authUrl,
            method: 'POST',
            data: authPayload,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = authResponse.data.access_token;
        console.log(`[DOWNLOAD] Token ottenuto con successo.`);

        // 2. Preparazione cartella
        if (clearFolder === true && fs.existsSync(uploadPath)) {
            const existingFiles = fs.readdirSync(uploadPath);
            for (const f of existingFiles) {
                fs.unlinkSync(path.join(uploadPath, f));
            }
        }
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const savedFiles = [];

        // 3. Download dei file
        for (const fileItem of files) {
            console.log(`[DOWNLOAD] Inizio download file: ${fileItem.name} (ID: ${fileItem.id})`);

            // 3.0 Controllo estensione (deve essere PDF)
            const isPdf = fileItem.extension?.toLowerCase() === 'pdf' || fileItem.name?.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
                throw new Error(`Il file ${fileItem.name} non è un PDF. Solo i file PDF sono ammessi.`);
            }

            const response = await axios({
                url: `https://pda.kiop.it/solida/api/pda/${pdaId}/file-entries/${fileItem.id}/download`,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                responseType: 'arraybuffer'
            });

            // 3.1 Controllo integrità (dimensione minima)
            const MIN_FILE_SIZE = 100; // 100 byte
            const fileBuffer = Buffer.from(response.data);

            if (fileBuffer.length < MIN_FILE_SIZE) {
                throw new Error(`Integrità fallita per ${fileItem.name}: il file è troppo piccolo (${fileBuffer.length} byte) e potrebbe essere corrotto.`);
            }

            // Determine filename based on type
            let fileName = fileItem.name;
            if (fileItem.type === 'Visura') {
                fileName = `${pdaId}_visura${suffix}.pdf`;
            } else if (fileItem.type === 'Documento di Identità') {
                fileName = `${pdaId}_id_card${suffix}.pdf`;
            } else if (fileItem.type === 'Altro') {
                fileName = `${pdaId}_pda${suffix}.pdf`;
            } else {
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    fileName = fileName.slice(0, -4) + suffix + '.pdf';
                } else {
                    fileName = fileName + suffix + '.pdf';
                }
            }

            const filePath = path.join(uploadPath, fileName);
            fs.writeFileSync(filePath, fileBuffer);
            savedFiles.push(fileName);
            console.log(`[DOWNLOAD] File salvato: ${fileName}`);
        }

        return {
            success: true,
            files: savedFiles
        };

    } catch (error) {
        console.error(`[DOWNLOAD] Errore critico durante la procedura:`, error.message);
        throw error;
    }
}

module.exports = downloadKiopFiles;

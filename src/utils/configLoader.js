const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

/**
 * Carica la configurazione dal file config.json.
 * Fornisce un modo centralizzato per accedere alle impostazioni senza riletture ridondanti.
 */
function getConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Errore caricamento configurazione:', error.message);
    }
    return {};
}

/**
 * Utility per ottenere un valore specifico con un fallback.
 */
function get(key, defaultValue = null) {
    const config = getConfig();
    return config[key] !== undefined ? config[key] : defaultValue;
}

module.exports = {
    getConfig,
    get
};

const { chromium } = require('playwright');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let config = {};
try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (error) {
    console.error('Errore caricamento config.json in interactive script.');
}

const DEFAULT_URL = config.FASTWEB_DEFAULT_URL || 'https://logon.fastweb.it/oam/server/obrareq.cgi';



(async () => {
    console.log('Avvio del browser...');
    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized']
    });

    // Creazione di un contesto e di una pagina
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    console.log('Navigazione alla pagina di login Fastweb...');
    await page.goto(DEFAULT_URL);


    console.log('\n=====================================================');
    console.log('Browser aperto in attesa di istruzioni.');
    console.log('Premi INVIO nel terminale per chiudere il browser.');
    console.log('=====================================================\n');

    // Interfaccia per leggere l'input dal terminale
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Mantiene il processo attivo finché non si preme INVIO
    await new Promise(resolve => rl.question('', resolve));

    console.log('Chiusura browser...');
    rl.close();
    await browser.close();
    process.exit(0);
})();

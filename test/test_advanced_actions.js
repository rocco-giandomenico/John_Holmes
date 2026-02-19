const executeJob = require('../src/procedures/executeJob');

// Mock Playwright Page
const mockPage = {
    locator: (selector) => ({
        waitFor: async () => { },
        innerText: async () => {
            if (selector === '#prefix-element') return '02';
            return '';
        },
        fill: async (val) => console.log(`[Mock] Filling ${selector} with "${val}"`)
    }),
    waitForTimeout: async (ms) => console.log(`[Mock] Waiting ${ms}ms...`)
};

// Mock Status Callback
const updateStatus = async (progress, step) => {
    console.log(`[Status] ${progress}% - ${step}`);
};

/**
 * Scenario di Test (Proof of Concept):
 * - Extract: Trova "02" e salvalo in 'pref'.
 * - Transform: Prendi "02020202", usa regex "^{{pref}}(.+)" per catturare "020202" in 'clean_num'.
 * - Fill: (Verificato tramite log del template risolto)
 */
async function test() {
    console.log('--- Test Inizio ---');
    const data = {
        actions: [
            {
                type: 'extract',
                locator: '#prefix-element',
                variable: 'pref',
                description: 'Estrazione prefisso'
            },
            {
                type: 'transform',
                input: '02020202',
                regex: '^{{pref}}(.+)',
                variables: ['clean_num'],
                description: 'Rimozione prefisso dinamico'
            },
            {
                type: 'fill',
                locator: 'input[name="phone"]',
                value: '{{clean_num}}',
                description: 'Inserimento numero pulito'
            }
        ]
    };

    try {
        await executeJob(mockPage, data, updateStatus);
        console.log('--- Test Completato con Successo ---');
    } catch (err) {
        console.error('--- Test Fallito ---', err.message);
    }
}

// Iniezione mock per i tool che non possono essere testati senza browser reale
// Nota: In un ambiente di test reale useremmo proxyquire o simili, qui simuliamo
// il fatto che i log mostrino la risoluzione corretta delle variabili.

test();

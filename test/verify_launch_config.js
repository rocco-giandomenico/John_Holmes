const browserManager = require('../src/browserManager');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

/**
 * Utility to update the configuration file.
 * The browserManager reloads this file on every .open() call.
 */
function updateConfig(headless) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config.HEADLESS = headless;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
}

async function testLaunchConfig() {
    console.log('--- Testing Headless Mode Config ---');

    // Test 1: Headless false (should open window)
    console.log('\n[Test 1] Headless: false');
    updateConfig(false);
    try {
        await browserManager.open();
        console.log('Browser opened successfully (Headed).');
        await browserManager.close(true);
        console.log('Browser closed.');
    } catch (error) {
        console.error('Test 1 failed:', error);
    }

    // Test 2: Headless true (should not open window)
    console.log('\n[Test 2] Headless: true');
    updateConfig(true);
    try {
        // browserManager.open() will reload config and apply headless: true
        await browserManager.open();
        console.log('Browser launched in headless mode successfully.');
        await browserManager.close(true);
        console.log('Browser closed.');
    } catch (error) {
        console.error('Test 2 failed:', error);
    }
}

testLaunchConfig();


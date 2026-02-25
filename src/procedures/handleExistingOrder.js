/**
 * Procedura per gestire ordini esistenti.
 * Assume che l'errore modale sia stato già validato esternamente e parte 
 * unicamente con la pressione del tasto di conferma della modale.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright su cui operare.
 * @param {Object} action - L'oggetto dell'azione specificata nel config
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
async function handleExistingOrderProcedure(page, action) {
    try {
        const confirmBtn = page.locator('.modal-footer .btn.btn-primary', { hasText: 'Conferma' }).first();

        if (await confirmBtn.count() > 0 && await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await page.waitForLoadState('networkidle');

            const accId = page.url().split('/').pop();
            await page.goto(`https://fastweb01.my.site.com/partnersales/CPQOrder?accId=${accId}`);
            await page.waitForLoadState('networkidle');

            const orderRow = page.locator('//tr[td[contains(text(),"IS.0228.0601NA")]]');
            await orderRow.waitFor({ state: 'visible' });
            await orderRow.click({ force: true });
            await page.waitForLoadState('networkidle');

            await page.waitForSelector('.modal-dialog');
            const newBill = page.locator('.modal-dialog tr td', { hasText: 'Nuovo Billing Account' }).first();
            await newBill.click();

            await page.waitForLoadState('networkidle');

            return { success: true, message: 'Existing order confirmed and handled successfully.' };
        } else {
            return { success: false, message: 'Tasto Conferma non visibile o modale inesistente.' };
        }
    } catch (e) {
        return { success: false, message: e.message };
    }
}

module.exports = handleExistingOrderProcedure;

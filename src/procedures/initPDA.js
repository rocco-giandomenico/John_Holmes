/**
 * Procedura di inizializzazione PDA (Proposta di Abbonamento).
 * Naviga verso GlobalSearch, seleziona 'Inserisci Ordine' e il codice prodotto specifico,
 * verificando poi il raggiungimento della pagina di configurazione (CPQOrder).
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright su cui operare.
 * @returns {Promise<{success: boolean, message: string, url: string}>}
 */
async function initPDA(page) {
    // URL di base per la ricerca globale e le azioni di Salesforce
    const pdaUrl = 'https://fastweb01.my.site.com/partnersales/apex/GlobalSearch?sfdc.tabName=01rw0000000kLSX';

    console.log('Navigazione verso pagina PDA...');
    await page.goto(pdaUrl, { waitUntil: 'networkidle' });

    // 1. Clicca su 'Inserisci Ordine'
    console.log('Cerco bottone "Inserisci Ordine"...');
    const inserisciOrdineBtn = page.locator('text=Inserisci Ordine');
    await inserisciOrdineBtn.waitFor({ state: 'visible', timeout: 10000 });
    await inserisciOrdineBtn.click();

    // 2. Selezione del codice prodotto specifico (IS.0228.0601NA)
    console.log('Cerco opzione "IS.0228.0601NA"...');
    const isCodeBtn = page.locator('text=IS.0228.0601NA');
    await isCodeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await isCodeBtn.click();

    // 3. Verifica del successo tramite monitoraggio dell'URL target
    // Ci aspettiamo che il sistema carichi la pagina CPQOrder
    const targetFlowURL = 'https://fastweb01.my.site.com/partnersales/apex/CPQOrder?sfdc.tabName=01rw0000000UdbF';
    console.log(`Attendo raggiungimento URL target: ${targetFlowURL}...`);

    try {
        // Monitora i cambi di URL aspettando che contenga la stringa chiave 'CPQOrder'
        await page.waitForURL(url => url.toString().includes('CPQOrder'), { timeout: 30000 });

        const finalUrl = page.url();
        console.log(`URL finale raggiunto: ${finalUrl}`);

        if (finalUrl.includes('CPQOrder')) {
            console.log('Procedura PDA inizializzata correttamente.');

            // 4. Ciclo robusto di chiusura Accordion (Polling fino a stabilizzazione)
            console.log('Avvio procedura di reset Accordion (chiusura forzata)...');

            // Attesa iniziale per assestamento pagina
            await page.waitForTimeout(2000);

            for (let i = 0; i < 5; i++) {
                const openPanelsCount = await page.evaluate(() => {
                    const toggles = document.querySelectorAll('.accordion-toggle');
                    let count = 0;
                    toggles.forEach(toggle => {
                        // Logica di rilevamento apertura robusta
                        const isExpanded = toggle.getAttribute('aria-expanded') === 'true' ||
                            toggle.classList.contains('active') ||
                            (toggle.closest('.panel') && toggle.closest('.panel').querySelector('.panel-collapse.in'));

                        if (isExpanded) {
                            toggle.click();
                            count++;
                        }
                    });
                    return count;
                });

                if (openPanelsCount === 0) {
                    console.log('Tutti i pannelli sono chiusi.');
                    break;
                }

                console.log(`Tentativo ${i + 1}: Chiusi ${openPanelsCount} pannelli. Attendo assestamento...`);
                await page.waitForTimeout(1000); // Attesa per animazioni/JS pagina
            }

            // Verifica finale basata sulla VISIBILITÀ REALE del contenuto
            // Ignoriamo gli attributi del bottone se il pannello sotto è nascosto
            const remainingOpen = await page.evaluate(() => {
                const panels = document.querySelectorAll('.panel-collapse');
                let realOpenCount = 0;

                panels.forEach(panel => {
                    const style = window.getComputedStyle(panel);
                    // Un pannello è "aperto" solo se è visibile e occupa spazio
                    const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        panel.offsetHeight > 0;

                    if (isVisible) {
                        // Verifichiamo anche che abbia la classe 'in' o 'show' per conferma
                        if (panel.classList.contains('in') || panel.classList.contains('show')) {
                            realOpenCount++;
                        }
                    }
                });
                return realOpenCount;
            });

            if (remainingOpen > 0) {
                console.error(`ATTENZIONE: ${remainingOpen} pannelli sembrano ancora visibili.`);
                // Facciamo fallire solo se ci sono pannelli REALMENTE aperti che potrebbero interferire
                return {
                    success: false,
                    message: `PDA Initialization Failed: ${remainingOpen} panels are still visible despite reset attempts.`,
                    url: finalUrl
                };
            }

            console.log('Stato pulito confermato: Tutti i pannelli sono chiusi.');

            return {
                success: true,
                message: 'PDA Initialized successfully (CPQOrder reached and panels reset).',
                url: finalUrl
            };
        }
    } catch (error) {
        // Se il timeout scade, il flusso potrebbe essere bloccato o aver preso un'altra strada
        console.error('Timeout o URL target non raggiunto.');
        return {
            success: false,
            message: `PDA flow failed. Target URL (CPQOrder) not reached. Current: ${page.url()}`,
            url: page.url()
        };
    }
}

module.exports = initPDA;

/**
 * Assicura che un accordion sia nello stato desiderato (aperto o chiuso).
 * Verifica l'attributo 'aria-expanded' prima di cliccare per evitare toggle indesiderati.
 * 
 * @param {import('playwright').Page} page - L'oggetto pagina di Playwright.
 * @param {string} locator - Il selettore dell'elemento toggle (es. 'a.accordion-toggle:has-text("...")').
 * @param {'open' | 'closed'} targetState - Lo stato finale desiderato. Default 'open'.
 */
async function setAccordionState(page, locator, targetState = 'open') {
    const section = page.locator(locator);

    // Verifichiamo se l'elemento esiste prima di procedere
    await section.waitFor({ state: 'attached', timeout: 5000 });

    const isExpanded = await section.getAttribute('aria-expanded') === 'true';

    if (targetState === 'open' && !isExpanded) {
        console.log(`Espansione accordion: ${locator}`);
        await section.click();
        await page.waitForTimeout(1000); // Attesa per animazione CSS
    } else if (targetState === 'closed' && isExpanded) {
        console.log(`Chiusura accordion: ${locator}`);
        await section.click();
        await page.waitForTimeout(1000);
    } else {
        console.log(`Accordion ${locator} già nello stato desiderato: ${targetState}`);
    }
}

module.exports = {
    setAccordionState
};

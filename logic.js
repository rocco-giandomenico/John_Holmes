// FUNCTIONS ------------------------------------------------------------------ 

function formatDateWithZeros(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;

    // Rimuove eventuale orario (T...) e spazi
    const dateOnly = dateStr.split('T')[0].trim();

    // Gestione 1955-05-29 -> 29/05/1955
    if (dateOnly.includes('-')) {
        const [year, month, day] = dateOnly.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    // Gestione fallback per slash (es. 1/5/1980)
    if (dateOnly.includes('/')) {
        const [day, month, year] = dateOnly.split('/');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    return dateStr;
}

// ----------------------------------------------------------------------------


const data = $json;
const actions = [];

// --- STEP 1: Inizializzazione ---
actions.push({
    "type": "procedure",
    "name": "initPDA",
    "description": "Inizializzazione PDA " + data.id
});

// ----------------------------------------------------------------------------
// DATI ANAGRAFICI
// ----------------------------------------------------------------------------

actions.push({
    "type": "open_accordion",
    "locator": "a.accordion-toggle:has-text(\"Dati Anagrafici\")",
    "description": "Apertura Dati Anagrafici"
});

actions.push({
    "type": "open_accordion",
    "locator": "a.accordion-toggle:has-text(\"Dati Fiscali\")",
    "description": "Apertura Dati Fiscali"
});

actions.push({
    "type": "radio",
    "locator": `input[name="section1_segmento"][value="${data.segmento || 'SHP'}"]`,
    "description": "Selezione Segmento"
});

actions.push({
    "type": "radio",
    "locator": `input[name="section1_tipologiaOfferta"][value="${data.tipo_offerta || 'FISSO'}"]`,
    "description": "Selezione Tipologia offerta"
});

if (data.customer.ragSociale) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_ragioneSociale\"]",
        "value": data.customer.ragSociale,
        "description": "Inserimento Ragione sociale"
    });
}

// --- FORMA GIURIDICA ---
const formaGiuridica = (data.customer.formaGiuridica || '').replace(/\.$/, '') || 'Altro';
actions.push({
    "type": "select",
    "locator": "select[name=\"section1_formaGiuridica\"]",
    "value": formaGiuridica,
    "description": "Selezione Forma Giuridica"
});

if (data.customer.partitaIva) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_partitaIva\"]",
        "value": data.customer.partitaIva,
        "description": "Inserimento Partita IVA"
    });
}

if (data.customer.nome) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_nomeReferente\"]",
        "value": data.customer.nome,
        "description": "Nome Rappresentante"
    });
}

if (data.customer.cognome) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_cognomeReferente\"]",
        "value": data.customer.cognome,
        "description": "Cognome Rappresentante"
    });
}

if (data.customer.sesso) {
    actions.push({
        "type": "radio",
        "locator": `input[name="section1_sessoReferente"][value="${data.customer.sesso}"]`,
        "description": "Selezione Sesso Rappresentante"
    });
}

if (data.customer.nascitaData) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_dataDiNascitaReferente\"]",
        "value": formatDateWithZeros(data.customer.nascitaData),
        "description": "Data di Nascita"
    });
}

// ----- NATO ALL'ESTERO ----- 
if (data.customer.nazioneTxt === "ITALIA") {

    actions.push({
        "type": "radio",
        "locator": "input[name=\"section1_natoAllEstero\"][value=\"false\"]",
        "description": "Selezione Nato all'estero"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name=\"section1_statoDiNascitaReferente\"]",
        "value": data.customer.nazioneTxt,
        "description": "Inserimento Stato di Nascita Rappresentante Legale"
    });

    if (data.customer.nascitaLuogoTxt) {
        actions.push({
            "type": "autocomplete",
            "locator": "input[name=\"section1_comuneDiNascitaReferente\"]",
            "value": data.customer.nascitaLuogoTxt,
            "description": "Inserimento Comune di Nascita Rappresentante Legale"
        });
    }

}

else {

    actions.push({
        "type": "radio",
        "locator": "input[name=\"section1_natoAllEstero\"][value=\"true\"]",
        "description": "Selezione Nato all'estero"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name=\"section1_statoDiNascitaReferente\"]",
        "value": data.customer.nazioneTxt,
        "description": "Inserimento Stato di Nascita Rappresentante Legale"
    });

}

// ----- CODICE FISCALE ----- 
if (data.customer.codFiscale) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_codiceFiscaleReferente\"]",
        "value": data.customer.codFiscale,
        "description": "Codice Fiscale"
    });

    actions.push({
        "type": "click",
        "locator": "button.btn.btn-primary[ng-click*=\"verificaCodiceFiscale('section1'\"]",
        "description": "Verifica Codice Fiscale"
    });
}


// ----- CELLULARE DI RIFERIMENTO -----
if (data.customer.contattoCellulare) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_numeroMobileDiRiferimento\"]",
        "value": data.customer.contattoCellulare,
        "description": "Inserimento Numerazione Mobile Rappresentante Legale"
    });
}

// ----- EMAIL -----
if (data.customer.email) {
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_email\"]",
        "value": data.customer.email,
        "description": "Email"
    });
    actions.push({
        "type": "fill",
        "locator": "input[name=\"section1_emailConferma\"]",
        "value": data.customer.email,
        "description": "Conferma Email"
    });
}

// ----------------------------------------------------------------------------
// DATI DI ATTIVAZIONE
// ----------------------------------------------------------------------------

// SE LA PDA NON È DI TIPO 1 (MOBILE) INSERISCO I DATI DI ATTIVAZIONE
if (data.pdaType !== 1) {

    actions.push({
        "type": "open_accordion",
        "locator": "a.accordion-toggle:has-text('Indirizzo di Copertura e Residenza')",
        "description": "Apertura Indirizzo di Copertura e Residenza"
    });

    actions.push({
        "type": "open_accordion",
        "locator": "a.accordion-toggle:has-text('Dati di Attivazione')",
        "description": "Apertura Dati di Attivazione"
    });


    // --- INDIRIZZO DI ATTIVAZIONE ---
    const toponimo = data.toponimo?.name || "";
    const street = (toponimo + " " + (data.indirizzoVia || "")).trim();
    const city = data.indirizzoCittaTxt || "";
    const num = data.indirizzoNum || "";

    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section2_cittaDiAttivazione']",
        "value": city,
        "description": "Inserimento Città di Attivazione"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section2_indirizzoDiAttivazione']",
        "value": street,
        "description": "Inserimento Indirizzo di Attivazione"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section2_civicoDiAttivazione']",
        "value": num || '0/SNC',
        "description": "Inserimento Civico di Attivazione"
    });

    // --- PORTABILITA' NUMERAZIONE ---
    const np = (data.lnanp === "NP" && !!data.npMigrationCodeVoce) ? "true" : "false";
    actions.push({
        "type": "radio",
        "locator": `input[name='section2_hasNumeroReteFissa'][value='${np}']`,
        "description": "Selezione Portabilità Numerazione"
    });

    if (np === "true") {
        actions.push({
            "type": "fill",
            "locator": ".panel:has-text('Dati di Attivazione') input[name='section_codiceDiMigrazioneFonia'] >> nth=0",
            "value": data.npMigrationCodeVoce,
            "description": "Inserimento Migration Code Voce"
        });
    }

}

// ----------------------------------------------------------------------------

// 3. Costruiamo il JSON finale per l'API
const jobPayload = {
    "pdaId": data.id || "job_" + Date.now(),
    "name": `Job per ${data.customer.ragSociale || 'nuovo cliente'}`,
    "actions": actions
};


// 4. Restituiamo il risultato a n8n
return [{
    json: jobPayload
}];

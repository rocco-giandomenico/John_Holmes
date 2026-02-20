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
if (data.customer.nascitaNazioneTxt === "ITALIA") {

    actions.push({
        "type": "radio",
        "locator": "input[name=\"section1_natoAllEsteroReferente\"][value=\"false\"]",
        "description": "Selezione Nato all'estero"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name=\"section1_statoDiNascitaReferente\"]",
        "value": data.customer.nascitaNazioneTxt,
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
        "locator": "input[name=\"section1_natoAllEsteroReferente\"][value=\"true\"]",
        "description": "Selezione Nato all'estero"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name=\"section1_statoDiNascitaReferente\"]",
        "value": data.customer.nascitaNazioneTxt,
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

    // --- ESTRAZIONE PREFISSO NUMERO DI TELEFONO DA PORTARE ---
    actions.push({
        "type": "extract",
        "locator": "input[name=\"section2_prefissoNumeroDiTelefonoReteFissa\"]",
        "variable": "prefisso_portare",
        "mode": "value",
        "description": "Estrazione Prefisso Numero di Telefono da Portare"
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

        // --- NUMERO DI TELEFONO 1 DA PORTARE ---
        actions.push({
            "type": "transform",
            "input": data.telFisso,
            "regex": "^{{prefisso_portare}}(.+)",
            "variables": ["numero_senza_prefisso"],
            "description": "Rimozione prefisso dal numero fisso"
        });

        actions.push({
            "type": "fill",
            "locator": "input[name=\"section2_numeroDiTelefonoReteFissa\"]",
            "value": "{{numero_senza_prefisso}}",
            "description": "Inserimento Numero di Telefono da Portare (senza prefisso)"
        });
    }

    // --- PORTABILITA' DATI ---
    const npDati = (!!data.npMigrationCodeDati) ? "true" : "false";
    actions.push({
        "type": "radio",
        "locator": `input[name='section2_hasServizioAdsl'][value='${npDati}']`,
        "description": "Selezione Portabilità Dati"
    });

    if (npDati === "true") {
        actions.push({
            "type": "fill",
            "locator": ".panel:has-text('Dati di Attivazione') input[name='section_codiceDiMigrazioneDati'] >> nth=0",
            "value": data.npMigrationCodeDati,
            "description": "Inserimento Migration Code Dati"
        });
    }

    // --- LINEA AGGIUNTIVA ---
    const npDati2 = "false";
    actions.push({
        "type": "radio",
        "locator": `input[name='section2_lineaAggiuntiva'][value='${npDati2}']`,
        "description": "Selezione Linea Aggiuntiva"
    });

    // --- VERIFICA COPERTURA ---
    actions.push({
        "type": "click",
        "locator": "button.btn.btn-primary[ng-click*=\"verificaCopertura()\"]",
        "description": "Verifica Copertura"
    });

    // --- CHIUSURA MODALE COPERTURA ---
    actions.push({
        "type": "click",
        "locator": "button.btn-primary:has-text('Chiudi'):visible",
        "description": "Chiusura modale esito copertura"
    });

}

// ----------------------------------------------------------------------------
// DATI DI RESIDENZA
// ----------------------------------------------------------------------------

actions.push({
    "type": "open_accordion",
    "locator": "a.accordion-toggle:has-text('Dati di Residenza')",
    "description": "Apertura Dati di Residenza"
});

// SE LA PDA NON È DI TIPO 1 (MOBILE)
if (data.pdaType !== 1) {

    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section2_cittaDiSedeLegale']",
        "value": data.customer.indirizzoCittaTxt || "",
        "description": "Inserimento Città di Sede Legale"
    });

    const toponimoRes = data.customer.indirizzoToponimo?.name || "";
    const streetRes = (toponimoRes + " " + (data.customer.indirizzoVia || "")).trim();

    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section2_indirizzoDiSedeLegale']",
        "value": streetRes,
        "description": "Inserimento Indirizzo di Sede Legale"
    });

    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section2_civicoDiSedeLegale']",
        "value": data.customer.indirizzoNum || '0/SNC',
        "description": "Inserimento Civico di Sede Legale"
    });

    actions.push({
        "type": "click",
        "locator": "button.btn-primary:has-text('Verifica Dati Fiscali')",
        "description": "Verifica Dati Fiscali"
    });
}

// ----------------------------------------------------------------------------
// DOCUMENTI
// ----------------------------------------------------------------------------

actions.push({
    "type": "open_accordion",
    "locator": "a.accordion-toggle:has-text('Documenti e Selezione Consensi')",
    "description": "Apertura Documenti e Selezione Consensi"
});

actions.push({
    "type": "open_accordion",
    "locator": "a.accordion-toggle:has-text('Documenti'):not(:has-text('Selezione'))",
    "description": "Apertura accordion Documenti"
});

// --- NAZIONALITA' DOCUMENTO ---
actions.push({
    "type": "autocomplete",
    "locator": "input[name='section4_nazionalitaDocumento']",
    "value": data.documento.nazionalitaTxt.toUpperCase(),
    "description": "Nazionalità Documento"
});

// --- TIPO DOCUMENTO ---
let tipoDocValue = (data.documento.tipoDocumento?.name || "").toUpperCase();
const tipoDocId = data.documento.tipoDocumento?.id;

if (tipoDocId === 1) tipoDocValue = "CARTA DI IDENTITA";
else if (tipoDocId === 2) tipoDocValue = "PASSAPORTO";
else if (tipoDocId === 3) tipoDocValue = "PATENTE";

actions.push({
    "type": "select",
    "locator": "select[name='section4_tipoDocumento']",
    "value": tipoDocValue,
    "description": "Tipo Documento"
});

// --- CITTADINANZA ---
if (data.documento.nazionalitaTxt.toUpperCase() === 'ITALIA' && data.documento.cittadinanza) {
    actions.push({
        "type": "select",
        "locator": "select[name='section4_cittadinanza']",
        "value": data.documento.cittadinanza.toUpperCase(),
        "description": "Cittadinanza"
    });
}

// --- NUMERO DOCUMENTO ---
actions.push({
    "type": "fill",
    "locator": "input[name='section4_numeroDocumento']",
    "value": data.documento.num,
    "description": "Numero Documento"
});

// --- LOCALITA' DI RILASCIO DOCUMENTO ---
if ((data.documento.tipoDocumento.name).toLowerCase() !== "passaporto") {
    actions.push({
        "type": "autocomplete",
        "locator": "input[name='section4_localitaDiRilascioDocumento']",
        "value": data.documento.luogoRilascioTxt.toUpperCase(),
        "description": "Località di Rilascio Documento"
    });
}

// --- ENTE EMITTENTE ---
let enteValue = (data.documento.enteRilascioDocumento?.name || "").toUpperCase();
const enteId = data.documento.enteRilascioDocumento?.id;

const enteMapping = {
    1: "COMUNE",
    2: "QUESTURA",
    3: "PREFETTURA",
    4: "MOTORIZZAZIONE",
    5: "RAPPRESENTANZA ITALIANA ESTERO",
    6: "STATO ESTERO",
    7: "U.C.O.",
    8: "MINISTERO DEGLI AFFARI ESTERI"
};

if (enteMapping[enteId]) {
    enteValue = enteMapping[enteId];
}

actions.push({
    "type": "select",
    "locator": "select[name='section4_enteEmittente']",
    "value": enteValue,
    "description": "Ente emittente"
});

// --- DATA DI RILASCIO DOCUMENTO ---
actions.push({
    "type": "fill",
    "locator": "input[name='section4_dataDiRilascioDocumento']",
    "value": formatDateWithZeros(data.documento.dataRilascio),
    "description": "Data di Rilascio Documento"
});

// --- PERMESSO DI SOGGIORNO ---
if (data.documento.numPs) {
    actions.push({
        "type": "fill",
        "locator": "input[name='section4_permessoDiSoggiorno']",
        "value": data.documento.numPs,
        "description": "Numero Permesso di Soggiorno"
    });

    if (data.documento.dataScadenzaPS) {
        actions.push({
            "type": "fill",
            "locator": "input[name='section4_dataScadenzaPermessoDiSoggiorno']",
            "value": formatDateWithZeros(data.documento.dataScadenzaPS),
            "description": "Data Scadenza Permesso di Soggiorno"
        });
    }
}

// --- VERIFICA DOCUMENTO ---
actions.push({
    "type": "click",
    "locator": "button.btn-primary:has-text('Verifica Documento')",
    "description": "Verifica Documento"
});

// ----------------------------------------------------------------------------
// DATI DI PAGAMENTO
// ----------------------------------------------------------------------------

actions.push({
    "type": "open_accordion",
    "locator": ".panel-heading:has-text('Metodo di Pagamento') a.accordion-toggle",
    "description": "Apertura Metodo di Pagamento"
});

actions.push({
    "type": "open_accordion",
    "locator": "a.accordion-toggle:has-text('Dati di Pagamento')",
    "description": "Apertura Dati di Pagamento"
});

const metodiPagamentoMap = {
    'IBAN': 'DIRECT DEBIT'
};

const addebitoAziendaMap = {
    'PIVA': 'true',
    'CF': 'false'
};

if (data.pagamento.paymentType === 'IBAN') {

    // 1. Selezione Metodo (Radio) - Gestisce Fisso o Mobile
    const fieldName = (data.tipo_offerta !== 'MOBILE') ? 'section3_metodoDiPagamento' : 'section3_metodoDiPagamento2';

    actions.push({
        "type": "radio",
        "locator": `input[name="${fieldName}"][value="${metodiPagamentoMap['IBAN']}"]`,
        "description": "Selezione Metodo: DIRECT DEBIT"
    });
    // 2. Apertura Accordion Completamento Dati (necessario per vedere i campi successivi)
    actions.push({
        "type": "open_accordion",
        "locator": "#j_id0\\:j_id6\\:j_id171 a.accordion-toggle:has-text('Completamento Dati')",
        "description": "Apertura Completamento Dati"
    });
    // 3. Controllo Intestatario (solo se non è individuale)
    if (data.customer.formaGiuridica !== 'Individuale') {

        // Calcolo della chiave per la mappa: se c'è PIVA allora è 'PIVA', altrimenti 'CF'
        const chiaveSoggetto = data.customer.partitaIva ? 'PIVA' : 'CF';
        const valoreRadio = addebitoAziendaMap[chiaveSoggetto];
        actions.push({
            "type": "radio",
            "locator": `input[name="section3_titolareContoAzienda"][value="${valoreRadio}"]`,
            "description": "Titolare Conto Azienda: " + (chiaveSoggetto === 'PIVA' ? 'Sì' : 'No')
        });
    }
}

// ----------------------------------------------------------------------------
// CREAZIONE OFFERTA
// ----------------------------------------------------------------------------

// 3. Navigazione al Carrello
actions.push({
    "type": "click",
    "locator": "button[ng-click='vaiAlCarrello()']",
    "description": "Click su Vai al Carrello"
});

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

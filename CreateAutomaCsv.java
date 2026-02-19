package it.ivert.kiop.pda.service.csv;

import it.ivert.kiop.pda.config.Constants;
import it.ivert.kiop.pda.service.GenericPdaService;
import it.ivert.kiop.pda.service.PagamentoService;
import it.ivert.kiop.shared.service.criteria.GenericPdaCriteria;
import it.ivert.kiop.shared.service.dto.*;
import it.ivert.kiop.shared.web.rest.errors.BadRequestAlertException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class CreateAutomaCsv {

    private final GenericPdaService genericPdaService;

    private final PagamentoService pagamentoService;

    public CreateAutomaCsv(GenericPdaService genericPdaService, PagamentoService pagamentoService) {
        this.genericPdaService = genericPdaService;
        this.pagamentoService = pagamentoService;
    }

    public String create(GenericPdaCriteria genericPdaCriteria, List<UserLiferayDTO> userLiferayDTO, Authentication authentication) {
        List<GenericPdaDTO> genericPdaDTOS =
                genericPdaService.findByCriteria("automa", null, genericPdaCriteria, userLiferayDTO, authentication);

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        StringBuilder sb = new StringBuilder();

        sb.append(this.generateHeaderCsv(
            genericPdaDTOS.get(0).getGroup().getGroupKey().toLowerCase(), genericPdaDTOS.get(0).getType().getId()));
        sb.append("\n");

        for (GenericPdaDTO pda : genericPdaDTOS) {
            sb.append(this.generateBodyCsv(pda));
            sb.append("\n");
        }

        return sb.toString();
    }

    private String generateHeaderCsv(String groupKey, Long type) {
        switch (groupKey) {
            case Constants.MANDATO_ENEL_ENERGIA:
                return String.join(";", List.of(
                    "segmento",
                    "formaGiuridica",
                    "numeroContrattoPreferica",
                    "nomePreverifica",
                    "cognomePreverifica",
                    "cfPreverifica",
                    "piPreverifica",
                    "dataFirmaInfoContratto",
                    "codiceIncaricatoInfoContratto",
                    "owner",
                    "sottoscrizioneContratto",
                    "podForniture",
                    "tipoPdaEnergia",
                    "capForniture",
                    "localitaForniture",
                    "tipodocumentoAnagraficaRes",
                    "numerodocumentoAnagraficaRes",
                    "rilasciatodaAnagraficaRes",
                    "rilasciatoilAnagraficaRes",
                    "telefonofissoAnagraficaRes",
                    "cellulareAnagraficaRes",
                    "emailAnagraficaRes",
                    "pecAnagraficaRes",
                    "toponomasticaAddress",
                    "indrizzoAddress",
                    "civicoAddress",
                    "scalaAddress",
                    "pianoCivicoAddress",
                    "internoAddress",
                    "capAddress",
                    "comuneAddress",
                    "provinciaAddress"
                ));
            case Constants.MANDATO_FASTWEB:
                List<String> fwbHead = new ArrayList<>(List.of(
                    "ID Firma Elettronica",
                    "Envelope ID",
                    "Tipo Invio",
                    "Tipo Offerta",
                    "Offerta Fissa",
                    "Offerta Mobile 1",
                    "Offerta Mobile 2",
                    "Ragione Sociale",
                    "Forma Giuridica",
                    "Partita Iva",
                    "Account",
                    "Nome",
                    "Cognome",
                    "Sesso",
                    "Data Nascita",
                    "Nazione Nascita",
                    "Città Nascita",
                    "Provincia Nascita",
                    "Codice Fiscale",
                    "Numero Mobile",
                    "Numero Fisso",
                    "Email",
                    "Tipo Documento Riconoscimento",
                    "Numero Documento Riconoscimento",
                    "Emittente Documento Riconoscimento",
                    "Data Rilascio Documento Riconoscimento",
                    "Nazionalità Rilascio Documento Riconoscimento",
                    "Cittadinanza Documento Riconoscimento",
                    "Città Rilascio Documento Riconoscimento",
                    "Provincia Rilascio Documento Riconoscimento",
                    "Città Residenza",
                    "Provincia Residenza",
                    "Indirizzo Residenza",
                    "Civico Residenza",
                    "CAP Residenza",
                    "Delegato",
                    "Nome Delegato",
                    "Cognome Delegato",
                    "Sesso Delegato",
                    "Data Nascita Delegato",
                    "Nazione Nascita Delegato",
                    "Città Nascita Delegato",
                    "Provincia Nascita Delegato",
                    "Codice Fiscale Delegato",
                    "Numero Mobile Delegato",
                    "Email Delegato",
                    "Tipo Documento Riconoscimento Delegato",
                    "Numero Documento Riconoscimento Delegato",
                    "Emittente Documento Riconoscimento Delegato",
                    "Data Documento Riconoscimento Delegato",
                    "Nazionalità Documento Riconoscimento Delegato",
                    "Città Documento Riconoscimento Delegato",
                    "Provincia Documento Riconoscimento Delegato",
                    "Città Attivazione",
                    "Provincia Attivazione",
                    "Indirizzo Attivazione",
                    "Civico Attivazione",
                    "CAP Attivazione",
                    "Scala Attivazione",
                    "Piano Attivazione",
                    "Interno Attivazione",
                    "Tecnologia Attivazione",
                    "Scelta Modem"
                ));

                if (type == 1) {
                    fwbHead.addAll(List.of(
                        "NP",
                        "Numero Telefonico",
                        "Codice Migrazione",
                        "Operatore Provenienza Fisso",
                        "Tipo Linea"
                    ));
                } else {
                    fwbHead.addAll(List.of(
                        "NP 1",
                        "Numero Telefonico 1",
                        "Codice Migrazione 1",
                        "Operatore Provenienza Fisso 1",
                        "Tipo Linea 1"
                    ));
                }

                fwbHead.addAll(List.of(
                    "NP Dati",
                    "Codice Migrazione Dati",
                    "Operatore Provenienza Dati",
                    "Segmento",
                    "Partnership",
                    "Sconto 1",
                    "Opzione Fisso 1",
                    "Opzione Fisso 2",
                    "Opzione Fisso 3",
                    "Seconda linea presente",
                    "NP 2",
                    "Numero Telefonico 2",
                    "Codice Migrazione 2",
                    "Operatore Provenienza Fisso 2",
                    "Tipo Linea 2",
                    "MNP 1",
                    "Numero Sim 1",
                    "ICCID Mobile 1",
                    "Operatore Provenienza Mobile 1",
                    "Tipo Contratto Mobile 1",
                    "Trasferimento Credito Mobile 1",
                    "MNP 2",
                    "Numero Sim 2",
                    "ICCID Mobile 2",
                    "Operatore Provenienza Mobile 2",
                    "Tipo Contratto Mobile 2",
                    "Trasferimento Credito Mobile 2",
                    "MNP 3",
                    "Numero Sim 3",
                    "ICCID Mobile 3",
                    "Operatore Provenienza Mobile 3",
                    "Tipo Contratto Mobile 3",
                    "Trasferimento Credito Mobile 3",
                    "Tipo Pagamento",
                    "IBAN",
                    "Intestato a",
                    "Shop ID",
                    "Payment ID",
                    "Circuito Carta",
                    "Numero Carta",
                    "Scadenza Carta",
                    "Token Carta",
                    "Città Spedizione",
                    "Provincia Spedizione",
                    "Indirizzo Spedizione",
                    "Civico Spedizione",
                    "CAP Spedizione",
                    "Spedizione Presso",
                    "Utente Creazione",
                    "Comsy Creazione",
                    "Ragione Sociale Comsy Creazione",
                    "Canale Comsy Creazione",
                    "Data Creazione",
                    "Data Firma",
                    "Stato Inserimento CPQ",
                    "Data Inserimento CPQ",
                    "Data Modifica",
                    "Data Scadenza",
                    "Data Invio SMS",
                    "ID PDA"
                ));

                return String.join(";", fwbHead);
            default:
                throw new BadRequestAlertException("Not managed group in automa export csv.", "AutomaExportCSV", "notManagedGroup");
        }
    }

    private String generateBodyCsv(GenericPdaDTO pda) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        BackOfficeDTO backoffice = pda.getBackOffice();
        CustomerDTO customer = pda.getCustomer();
        OfferDTO offerPhone = pda.getOffer();
        DocumentoDTO customerDoc = pda.getCustomerDoc();
        TipoDocumentoDTO tipoDoc = pda.getCustomerDoc().getTipoDocumento();
        EnteRilascioDocumentoDTO enteRilascioDoc = customerDoc != null ? customerDoc.getEnteRilascioDocumento() : null;
        TypeDTO segmento = pda.getType();
        PagamentoDTO payment = pda.getPagamento();
        String iban = payment != null ? pagamentoService.getBankIbanEncrypt(payment) : "";

        switch (pda.getGroup().getGroupKey().toLowerCase()) {
            case Constants.MANDATO_ENEL_ENERGIA:
                return String.join(";", List.of(
                    String.valueOf(segmento != null && segmento.getName() != null ? segmento.getName() : ""), // mandato
                    String.valueOf(customer.getFormaGiuridica() != null ? customer.getFormaGiuridica() : ""), // formaGiuridica
                    String.valueOf(pda.getCodeAccount() != null ? pda.getCodeAccount() : ""), // numeroContrattoPreferica
                    String.valueOf(customer.getNome() != null ? customer.getNome() : ""), // nomePreverifica
                    String.valueOf(customer.getCognome() != null ? customer.getCognome() : ""), // cognomePreverifica
                    String.valueOf(customer.getCodFiscale() != null ? customer.getCodFiscale() : ""), // cfPreverifica
                    String.valueOf(customer.getPartitaIva() != null ? customer.getPartitaIva() : ""), // piPreverifica
                    "", // dataFirmaInfoContratto
                    "", // codiceIncaricatoInfoContratto
                    String.valueOf(pda.getOwnerId() != null && pda.getOwnerId().getScreenName() != null ? pda.getOwnerId().getScreenName() : ""), // owner
                    "", // sottoscrizioneContratto
                    String.valueOf(pda.getPod() != null ? pda.getPod() : ""), // podForniture
                    String.valueOf(pda.getTipoPdaEnergia() != null ? pda.getTipoPdaEnergia() : ""), // tipoPdaEnergia
                    String.valueOf(pda.getIndirizzoCap() != null ? pda.getIndirizzoCap() : ""), // capForniture
                    String.valueOf(pda.getIndirizzoCittaTxt() != null ? pda.getIndirizzoCittaTxt() : ""), // localitaForniture
                    String.valueOf(customerDoc != null && customerDoc.getTipoDocumento() != null && customerDoc.getTipoDocumento().getDescription() != null
                        ? customerDoc.getTipoDocumento().getDescription()
                        : "" ), // tipodocumentoAnagraficaRes
                    String.valueOf(customerDoc != null && customerDoc.getNum() != null ? customerDoc.getNum() : ""), // numerodocumentoAnagraficaRes
                    String.valueOf(enteRilascioDoc != null && enteRilascioDoc.getName() != null ? enteRilascioDoc.getName() : ""), // rilasciatodaAnagraficaRes
                    customerDoc != null && customerDoc.getDataRilascio() != null
                        ? customerDoc.getDataRilascio().format(formatter)
                        : "", // rilasciatoilAnagraficaRes
                    String.valueOf(pda.getTelFisso() != null ? pda.getTelFisso() : ""), // telefonofissoAnagraficaRes
                    String.valueOf(customer.getCellulare1() != null ? customer.getCellulare1() : ""), // cellulareAnagraficaRes
                    String.valueOf(customer.getEmail() != null ? customer.getEmail() : ""), // emailAnagraficaRes
                    String.valueOf(customer.getEmailPec() != null ? customer.getEmailPec() : ""), // pecAnagraficaRes
                    String.valueOf(pda.getToponimo() != null && pda.getToponimo().getName() != null ? pda.getToponimo().getName() : ""), // toponomasticaAddress
                    String.valueOf(pda.getIndirizzoVia() != null ? pda.getIndirizzoVia() : ""), // indrizzoAddress
                    String.valueOf(pda.getIndirizzoNum() != null ? pda.getIndirizzoNum() : ""), // civicoAddress
                    String.valueOf(pda.getIndirizzoScala() != null ? pda.getIndirizzoScala() : ""), // scalaAddress
                    String.valueOf(pda.getIndirizzoPiano() != null ? pda.getIndirizzoPiano() : ""), // pianoCivicoAddress
                    String.valueOf(pda.getIndirizzoInterno() != null ? pda.getIndirizzoInterno() : ""), // internoAddress
                    String.valueOf(pda.getIndirizzoCap() != null ? pda.getIndirizzoCap() : ""), // capAddress
                    String.valueOf(pda.getIndirizzoCittaTxt() != null ? pda.getIndirizzoCittaTxt() : ""), // comuneAddress,
                    String.valueOf(pda.getIndirizzoProvinciaSpedizioneTxt() != null ? pda.getIndirizzoProvinciaSpedizioneTxt() : "") // provinciaAddress
                ));
            case Constants.MANDATO_FASTWEB:
                try {
                    return String.join(";", List.of(
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        pda.getPdaType() != null ? Constants.formatPdaType(pda.getPdaType()) : "",
                        offerPhone != null && offerPhone.getName() != null ? offerPhone.getName() : "",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        customer != null && customer.getRagSociale() != null ? customer.getRagSociale() : "",
                        customer != null && customer.getFormaGiuridica() != null ? customer.getFormaGiuridica() : "",
                        customer != null && customer.getPartitaIva() != null ? customer.getPartitaIva() : "",
                        backoffice != null && backoffice.getAccount() != null ? backoffice.getAccount() : "",
                        customer != null && customer.getNome() != null ? customer.getNome() : "",
                        customer != null && customer.getCognome() != null ? customer.getCognome() : "",
                        customer != null && customer.getSesso() != null ? customer.getSesso() : "",
                        customer != null && customer.getNascitaData() != null ? customer.getNascitaData().format(formatter) : "",
                        (customer != null && customer.getNascitaNazioneTxt() != null && !customer.getNascitaNazioneTxt().isEmpty() ?
                            customer.getNascitaNazioneTxt() : "ITALIA").toUpperCase(),
                        customer != null && customer.getNascitaLuogoTxt() != null ? customer.getNascitaLuogoTxt().toUpperCase() : "",
                        customer != null && customer.getNascitaProvinciaTxt() != null ? customer.getNascitaProvinciaTxt() : "",
                        customer != null && customer.getCodFiscale() != null ? customer.getCodFiscale() : "",
                        customer != null && customer.getContattoCellulare() != null ? customer.getContattoCellulare() : "",
                        customer != null && customer.getContattoTelefono() != null ? customer.getContattoTelefono() : "",
                        customer != null && customer.getEmail() != null ? customer.getEmail() : "",
                        tipoDoc != null ? tipoDoc.getName() : "",
                        customerDoc != null ? customerDoc.getNum() : "",
                        enteRilascioDoc != null ? enteRilascioDoc.getName() : "",
                        customerDoc != null && customerDoc.getDataRilascio() != null ?
                            customerDoc.getDataRilascio().format(formatter) : "",
                        (customerDoc != null && customerDoc.getNazionalitaTxt() != null && !customerDoc.getNazionalitaTxt().isEmpty() ?
                            customerDoc.getNazionalitaTxt() : "ITALIA").toUpperCase(),
                        customerDoc != null && customerDoc.getCittadinanza() != null && !customerDoc.getCittadinanza().isEmpty() ?
                            customerDoc.getCittadinanza() : "",
                        customerDoc != null && customerDoc.getLuogoRilascioTxt() != null ?
                            customerDoc.getLuogoRilascioTxt().toUpperCase() : "",
                        customerDoc != null && customerDoc.getProvRilascioTxt() != null ? customerDoc.getProvRilascioTxt() : "",
                        customer != null && customer.getIndirizzoCittaTxt() != null ? customer.getIndirizzoCittaTxt().toUpperCase() : "",
                        customer != null && customer.getIndirizzoProvinciaTxt() != null ? customer.getIndirizzoProvinciaTxt() : "",
                        customer != null && customer.getIndirizzoVia() != null && customer.getIndirizzoToponimo() != null ?
                            (customer.getIndirizzoToponimo().getName() + " " + customer.getIndirizzoVia()).toUpperCase() : "",
                        customer != null && customer.getIndirizzoNum() != null ? customer.getIndirizzoNum() : "",
                        customer != null && customer.getIndirizzoCap() != null ? customer.getIndirizzoCap() : "",
                        "FALSO",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        pda.getIndirizzoCittaTxt() != null ? pda.getIndirizzoCittaTxt().toUpperCase() : "",
                        pda.getIndirizzoProvinciaTxt() != null ? pda.getIndirizzoProvinciaTxt() : "",
                        pda.getIndirizzoVia() != null && pda.getToponimo() != null && pda.getToponimo().getName() != null ?
                            (pda.getToponimo().getName() + " " + pda.getIndirizzoVia()).toUpperCase() : "",
                        pda.getIndirizzoNum() != null ? pda.getIndirizzoNum() : "",
                        pda.getIndirizzoCap() != null ? pda.getIndirizzoCap() : "",
                        pda.getIndirizzoScala() != null ? pda.getIndirizzoScala() : "",
                        pda.getIndirizzoPiano() != null ? pda.getIndirizzoPiano() : "T",
                        pda.getIndirizzoInterno() != null ? pda.getIndirizzoInterno() : "",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        pda.getLnanp() != null ? Constants.formatTipoLinea(pda.getLnanp()) : "",
                        pda.getTelFisso() != null ? pda.getTelFisso() : "",
                        pda.getNpMigrationCodeVoce() != null ? pda.getNpMigrationCodeVoce() : "",
                        pda.getGestoreFisso() != null ? pda.getGestoreFisso() : "",
                        Constants.EMPTY_STRING,
                        pda.getNpMigrationCodeDati() != null && !pda.getNpMigrationCodeDati().isEmpty() ? "VERO" : "FALSO",
                        pda.getNpMigrationCodeDati() != null ? pda.getNpMigrationCodeDati() : "",
                        pda.getGestoreDati() != null ? pda.getGestoreDati() : "",
                        segmento != null ? segmento.getName() : "",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        payment != null && payment.getPaymentType() != null ? payment.getPaymentType() : "",
                        iban != null && !iban.isEmpty() ? iban : "",
                        payment == null || payment.getBankCustomerType() == null || payment.getBankCustomerType() == 0 ?
                            "CF" : "PIVA",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        pda.getIndirizzoCittaSpedizioneTxt() != null ? pda.getIndirizzoCittaSpedizioneTxt().toUpperCase() : "",
                        pda.getIndirizzoProvinciaSpedizioneTxt() != null ? pda.getIndirizzoProvinciaSpedizioneTxt() : "",
                        pda.getIndirizzoViaSpedizione() != null && pda.getToponimoIndirizzoSpedizione() != null ?
                            (pda.getToponimoIndirizzoSpedizione().getName() + " " + pda.getIndirizzoViaSpedizione()).toUpperCase() : "",
                        pda.getIndirizzoNumSpedizione() != null ? pda.getIndirizzoNumSpedizione() : "",
                        pda.getIndirizzoCapSpedizione() != null ? pda.getIndirizzoCapSpedizione() : "",
                        "",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        pda.getCreateDate() != null ? pda.getCreateDate().atZone(ZoneId.of("Europe/Rome")).format(formatter) : "",
                        pda.getCreateDate() != null ? pda.getCreateDate().atZone(ZoneId.of("Europe/Rome")).format(formatter) : "",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        pda.getCreateDate() != null ? pda.getCreateDate().atZone(ZoneId.of("Europe/Rome")).format(formatter) : "",
                        Constants.EMPTY_STRING,
                        Constants.EMPTY_STRING,
                        pda.getId() != null ? pda.getId().toString() : ""
                    ));
                } catch (Exception e) {
                    e.printStackTrace();
                    return null;
                }
            default:
                throw new BadRequestAlertException("Not managed group in automa export csv.", "AutomaExportCSV", "notManagedGroup");
        }
    }
}

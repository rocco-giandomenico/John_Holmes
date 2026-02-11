# Playwright Express Server API (Project Knowledge Base)

Questo file funge da **Knowledge Base (KB) primaria** e fonte di verità per tutto il progetto John_Holmes. Ogni decisione tecnica, modifica all'API o cambio di configurazione deve essere documentato qui.


## Requisiti

- Node.js installato
- Dipendenze installate: `npm install`

## Avvio del Server

Per avviare il server sulla porta 3000:

```bash
npm start
```

Per lo sviluppo (con auto-reload):

```bash
npm run dev
```

## Endpoint API

### 1. Apri Browser
Apre un'istanza di Chromium (non headless) e naviga verso un URL specificato.

- **URL**: `/open-browser`
- **Metodo**: `POST`
- **Body (JSON)**:
    - `url` (opzionale): L'indirizzo web da aprire.

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Browser aperto e navigazione completata.",
        "url": "[URL]"
    }
    ```
- **Risposta Errore (400 Bad Request)**:
    ```json
    {
        "success": false,
        "error": "Messaggio di errore"
    }
    ```


#### Esempi
```bash
# Apre l'URL di default
curl -X POST http://localhost:3000/open-browser -H "Content-Type: application/json" -d '{}'

# Apre un URL specifico
curl -X POST http://localhost:3000/open-browser -H "Content-Type: application/json" -d '{"url":"https://www.google.com"}'
```


---

### 2. Login
Esegue l'autenticazione automatica sul portale Fastweb.

- **URL**: `/login`
- **Metodo**: `POST`
- **Body (JSON)**:
    - `username` (obbligatorio): Username Fastweb.
    - `password` (obbligatorio): Password Fastweb.

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Login effettuato con successo.",
        "url": "[Nuova URL dopo redirect]"
    }
    ```
- **Risposta Errore (401 Unauthorized)**:
    ```json
    {
        "success": false,
        "error": "Login failed. Please check credentials."
    }
    ```
- **Risposta Errore (Sessione Concorrente)**:
    ```json
    {
        "success": false,
        "error": "Concurrent Session Detected"
    }
    ```


#### Esempio
```bash
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{"username":"MIO_USER", "password":"MIA_PASSWORD"}'
```


---

### 3. Logout Sicuro
Esegue il logout formale dal portale Fastweb navigando verso GlobalSearch e cliccando su "Esci".

- **URL**: `/secure-logout`
- **Metodo**: `POST`

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "message": "Logout effettuato con successo."
    }
    ```
- **Risposta Errore (500 Internal Server Error)**:
    ```json
    {
        "success": false,
        "error": "Logout failed..."
    }
    ```

#### Esempio
```bash
curl -X POST http://localhost:3000/secure-logout
```

---

### 4. Stato Pagina
Restituisce l'URL e il titolo della pagina attualmente aperta nel browser.

- **URL**: `/current-page`
- **Metodo**: `POST`

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "browserOpen": true,
        "url": "https://...",
        "title": "Titolo Pagina"
    }
    ```
    Se il browser è chiuso:
    ```json
    {
        "success": true,
        "browserOpen": false,
        "url": null,
        "title": null
    }
    ```


#### Esempio
```bash
curl -X POST http://localhost:3000/current-page
```


---

### 5. Chiudi Browser
Chiude l'istanza del browser attualmente aperta. Rispetta lo stato della sessione a meno che non venga forzato.

- **URL**: `/close-browser`
- **Metodo**: `POST`
- **Body (JSON)**:
    - `force` (opzionale): Se `true`, chiude il browser anche se la sessione è attiva.

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "status": "closed",
        "message": "Browser chiuso correttamente."
    }
    ```
    oppure (se la sessione è attiva):
    ```json
    {
        "success": true,
        "status": "mantained",
        "message": "Il browser è rimasto aperto perché la sessione è attiva..."
    }
    ```


#### Esempio
```bash
# Tenta di chiudere rispettando la sessione
curl -X POST http://localhost:3000/close-browser -H "Content-Type: application/json" -d '{}'

# Forza la chiusura
curl -X POST http://localhost:3000/close-browser -H "Content-Type: application/json" -d '{"force": true}'
```


---

### 6. Stato Sessione (Interno)
Permette di consultare o aggiornare manualmente lo stato di "Logged In" nel file di stato locale (`session_state.json`), influenzando il comportamento di chiusura del browser.

- **URL**: `/api/session-status`
- **Metodo**: `POST`
- **Body (JSON)**:
    - `logged` (opzionale): `true` o `false`. Se omesso, restituisce solo lo stato attuale.

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "isLoggedIn": true,
        "message": "Stato sessione: LOGGED IN"
    }
    ```


#### Esempio
```bash
# Legge lo stato
curl -X POST http://localhost:3000/api/session-status

# Imposta come loggato
curl -X POST http://localhost:3000/api/session-status -H "Content-Type: application/json" -d '{"logged": true}'
```


---

### 7. Inizializza PDA
Avvia la procedura di creazione offerta (PDA) navigando verso `GlobalSearch`, selezionando 'Inserisci Ordine' e il codice 'IS.0228.0601NA'.

- **URL**: `/pda-init`
- **Metodo**: `POST`

- **Risposta Successo (200 OK)**:
    ```json
    {
        "success": true,
        "message": "PDA Initialized successfully...",
        "url": "..."
    }
    ```

#### Esempio
```bash
curl -X POST http://localhost:3000/pda-init
```


---

## Test

Nella cartella `test/` sono presenti gli script per i test automatici:

- `full_flow_test.js`: Esegue un test completo: apertura, login e logout.
- `test_login.js`: Testa specificamente la procedura di login.
- `test_logout.js`: Testa specificamente la procedura di logout.

Puoi eseguirli con node, ad esempio: `node test/full_flow_test.js`

## Script di Utilità

Nella cartella `scripts/` sono presenti script per interazione manuale e debug:

- `interactive_browser.js`: Apre il browser e lo mantiene aperto per interazione manuale, utile per debug.

Puoi eseguirlo con: `node scripts/interactive_browser.js`

## Note Tecniche

- Il server gestisce un'unica istanza di browser alla volta tramite la classe `BrowserManager` (Singleton).
- Lo stato del login è persistito in `session_state.json`.
- La configurazione (URL, Porta) è gestita in `config.json`.
- Il browser viene avviato con la finestra massimizzata e modalità non-headless per visibilità.

## Integrazione con n8n

È possibile integrare questo server in un workflow **n8n** utilizzando il file `n8n_workflow.json` incluso nel progetto.

### Come importare il workflow
1. Apri n8n.
2. Crea un nuovo workflow.
3. Clicca sui tre puntini in alto a destra -> **Import from File**.
4. Seleziona il file `n8n_workflow.json`.

### Configurazione
Il workflow di esempio include nodi per:
- Login (dovrai sostituire `YOUR_USERNAME` e `YOUR_PASSWORD` nel nodo "Login to Fastweb").
- Controllo Sessione.
- Inizializzazione PDA.

> **Nota per utenti Docker**: Se n8n gira in un container Docker, potrebbe non riuscire a raggiungere `localhost`. In tal caso, sostituisci `localhost` con `host.docker.internal` negli URL dei nodi HTTP Request.

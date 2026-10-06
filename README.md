# 🂠 LA RUSPA - Variante Moderna della Scopa

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-3.2-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Test%20Suite-6%2F6%20PASS-brightgreen?logo=checkmarx)](https://github.com/ddiseri0/RUSPA)
[![WebMCP](https://img.shields.io/badge/WebMCP-Ready-purple)](https://github.com/ddiseri0/RUSPA)

**La Ruspa** è una variante moderna e competitiva della tradizionale Scopa a 40 carte napoletane (giocabile 1v1 o 2v2 a coppie), che arricchisce la tradizione con meccaniche ad alta tensione di **Informazione Nascosta**, **Bluff** e **Dubito**.

---

## 📜 Regole di Gioco Ufficiali

### 1. Mazzo, Distribuzione e Smazzate
- **Mazzo Tradizionale:** 40 carte napoletane (semi: *Denari*, *Coppe*, *Spade*, *Bastoni*; valori: 1-7, 8/Donna, 9/Cavallo, 10/Re).
- **Inizio Manche:** Vengono poste 4 carte scoperte a terra e distribuite 3 carte a ciascun giocatore.
  - **Eccezione 3+ Re:** Se tra le 4 carte iniziali a terra sono presenti 3 o 4 Re (valore 10), la smazzata è nulla: il mazzo viene rimescolato e ridistribuito automaticamente.
- **Distribuzione a gruppi di 3:** Quando le mani sono vuote, vengono distribuite altre 3 carte fino all'esaurimento delle 40 carte del mazzo.
- **Ultime carte a terra:** Al termine della smazzata (dopo 40 carte), le carte residue a terra vengono incassate da chi ha effettuato l'ultima presa valida (non assegna punto Scopa).
- **Vittoria a 21 Punti:** La partita si vince raggiungendo o superando i **21 punti**. Se una squadra raggiunge 21 durante la smazzata, la partita **NON termina all'istante**: si completa l'intero Match (tutte le 40 carte) e si calcola il punteggio finale. Vince chi ha il punteggio più alto. In caso di parità a $\ge 21$, si disputa una nuova manche di spareggio.

### 2. Logica di Giocata e Prese
- **Scarto a terra (Nessuna presa):** Se si cala una carta senza effettuare prese, la carta scende **scoperta a faccia in su**. Non attiva presa e **NON attiva la finestra del Dubito**.
- **Priorità Presa Singola (Regola Ufficiale):** Se la carta giocata corrisponde sia a una singola carta sul tavolo sia alla somma di più carte, il motore **obbliga la presa della carta singola**.
- **Presa Normale (Coperta):** Quando si dichiara una presa, la carta giocata rimane **coperta a faccia in giù**. L'avversario vede solo le carte a terra selezionate. Svuotare il tavolo con presa regolare assegna **1 punto di Scopa** immediato (eccetto nell'ultima mano del mazzo, dove non è mai scopa).
- **L'Asso ("La Ruspa"):**
  - L'Asso può essere giocato esclusivamente come "Ruspa": prende istantaneamente tutte le carte a terra.
  - La giocata è **sempre coperta** ed è soggetta a Dubito.
  - **La Ruspa NON assegna MAI punto di Scopa**, anche se il tavolo viene ripulito.

### 3. Meccanica "Dubito" e Risoluzione Bluff
- Ad ogni presa coperta (regolare o Asso), si apre una finestra con **timer di 5 secondi**.
- L'avversario (o la coppia) può premere **"Dubito"**. Se il timer scade, la presa è confermata tacitamente.
- **Risoluzione Dubito:**
  - **Presa Corretta / Veritiera:** Chi ha preso incassa **1 punto** (assegnato graficamente come Scopa). Le carte prese vanno nel suo mazzo prese.
  - **Presa Scorretta / Bluff Smascherato:**
    1. Chi ha dubitato incassa **1 punto** (assegnato graficamente come Scopa).
    2. La carta bluffata viene rivelata e lasciata scoperta a terra sul tavolo; le carte che si tentava di prendere restano a terra.
    3. Il giocatore scorretto non incassa alcuna carta e il turno passa all'avversario.

### 4. Punti di Fine Smazzata (Assegnati solo a fine smazzata)
1. **Scope e Punti Dubito:** Calcolati e mostrati in tempo reale.
2. **Settebello:** 1 punto a chi possiede il 7 di Denari.
3. **Carte a Denari:** 1 punto a chi ha >5 denari. In caso di parità (5 a 5) vengono assegnati **0 punti**.
4. **Carte a Lungo (Totale Carte):** 1 punto a chi ha >20 carte. In caso di parità (20 a 20) vengono assegnati **0 punti**.
5. **Settanta (Primiera):** 1 punto calcolato sui migliori valori per seme (7=21, 6=18, Asso=16, 5=15, 4=14, 3=13, 2=12, Figure=10). In caso di parità vengono assegnati **0 punti**.

---

## 🏛️ Architettura del Codice (Clean Code)

```
RUSPA/
├── src/
│   ├── logica/               # Dominio puro (100% italiano, disaccoppiato da React)
│   │   ├── tipiGioco.ts      # Modelli di dominio (Carta, Seme, Mossa, StatoPartita, ecc.)
│   │   └── regoleScopa.ts    # Algoritmi di gioco, presa singola, Primiera, 3+ Re
│   ├── components/           # Componenti React (iPhone-First & Viewport Lock 100dvh)
│   │   ├── GameBoard.tsx     # Tavolo da gioco, blocco viewport, controlli di gioco
│   │   ├── ScoreBoard.tsx    # Tabellone punti live: Scope in evidenza + statistiche
│   │   ├── DubitoModal.tsx   # Finestra modale con timer a 5 secondi
│   │   ├── CardView.tsx      # Rendering grafico carte napoletane in stile squircle
│   │   ├── CardBack.tsx      # Dorso elegante con animazioni di suspense
│   │   └── LobbyView.tsx     # Schermata di ingresso e gestione stanze 1v1 / 2v2
│   ├── services/
│   │   └── firestoreSync.ts  # Orchestratore di stato, sincronizzazione realtime e fallback
│   ├── lib/
│   │   ├── firebase.ts       # Configurazione Firebase & auth anonima
│   │   └── webMcpBridge.ts   # Bridge MCP per automazione e ispezione
│   ├── App.tsx               # Root app React
│   └── index.css             # Styling con classi utility Tailwind e dark mode
├── scripts/
│   ├── test-regole.ts        # Suite unit test anti-regressione ufficiale (6/6 scenari)
│   └── test-agent.mjs        # Test runner end-to-end con Chrome Headless via CDP
├── tailwind.config.cjs       # Configurazione Tailwind CommonJS ottimizzata
└── vite.config.ts            # Configurazione Vite con middleware WebMCP Dev Server
```

---

## 🚀 Avvio Rapido in Locale

### Prerequisiti
- **Node.js** v18+ (consigliato v20 o v22)
- **npm** v9+

### Installazione ed Esecuzione
```bash
# 1. Clona il repository ed entra nella cartella
git clone https://github.com/ddiseri0/RUSPA.git
cd RUSPA

# 2. Installa le dipendenze
npm install

# 3. Avvia l'applicazione in modalità sviluppo (porta 3000)
npm run dev
```

L'applicazione sarà accessibile su `http://localhost:3000`.

---

## 🧪 Test Suite & Anti-Regressione

Il progetto include due livelli di testing integrati:

### 1. Test Unitari Regole di Gioco
Esegue la suite algoritmica che convalida i 6 scenari cardine delle specifiche:
```bash
npm test
```
**Scenari verificati:**
1. Calata senza presa = carta scoperta, nessun evento Dubito.
2. Forzatura della presa singola rispetto alla combinazione di somma.
3. Comportamento Asso Ruspa (tavolo ripulito, nessun punto Scopa assegnato).
4. Risoluzione del Dubito (vittoria bluff vs vittoria accusatore con corretta gestione carte).
5. Assegnazione di 0 punti in caso di parità su denari (5-5) e carte totali (20-20).
6. Regola dei 3+ Re a terra all'inizio con rimescolamento automatico e completamento a 40 carte.

### 2. Test End-to-End Headless Chrome (WebMCP)
Esegue un'istanza headless di Google Chrome controllata tramite CDP per simulare utenti reali, creare stanze, giocare carte e verificare l'interfaccia:
```bash
npm run test:mcp
```

### 3. Compilazione Produzione
```bash
npm run build
```

---

## ☁️ Configurazione per Vercel & Firebase

L'applicazione funziona **out-of-the-box in locale** grazie al fallback automatico su memoria locale e middleware SSE (Server-Sent Events) di Vite.

Per il deploy in produzione multi-dispositivo su **Vercel**:
1. Crea un progetto Firebase con Firestore Database abilitato.
2. Configura le variabili d'ambiente su Vercel (o in un file `.env` locale):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🤖 Modulo WebMCP (Automazione & Ispezione)

Il middleware di sviluppo Vite integra endpoint WebMCP per l'ispezione automatizzata dello stato:
- **`GET /__mcp/health`**: Verifica lo stato operativo del servizio bridge.
- **`GET /__mcp/test-rules`**: Esegue e restituisce lo stato di superamento dei 6 scenari di test algoritmici.
- **`GET /__api/rooms/:id`**: Ispezione dello stato corrente della stanza in formato JSON.
- **`GET /__api/rooms/:id/events`**: Stream SSE per la sincronizzazione real-time multiprocesso.
- **`window.__RUSPA_MCP__`**: Oggetto esposto nel client per interagire a livello headless (creazione stanze, mosse e dubito programmatici).

---

## 📄 Licenza
Rilasciato sotto licenza MIT.

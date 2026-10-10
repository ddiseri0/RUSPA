# 📜 Costituzione del Progetto e Standard Operativi (`AGENTS.md`)

Questo documento stabilisce i principi architetturali, gli standard di sviluppo e i protocolli operativi vincolanti per il repository **LA RUSPA**.  
Qualsiasi agente autonomo (AI), assistente o sviluppatore umano che interagisce con questo codebase è tenuto ad attenersi rigorosamente a queste norme.

---

## 1. 🏛️ Costituzione del Cuore Applicativo (Core)

### 1.1 Confini e Isolamento del Motore (`src/logica/`)

- La cartella **`src/logica/`** (`regoleScopa.ts`, `tipiGioco.ts`) costituisce il **cuore inviolabile e puro** delle regole di gioco de _La Ruspa_.
- **Purezza Assoluta:** Il cuore applicativo deve contenere unicamente logica computazionale deterministica, priva di effetti collaterali (side effects) e priva di I/O.
- **Divieto di Dipendenze da Framework:** È fatto espresso divieto per qualsiasi modulo in `src/logica/` di importare:
  - Framework di interfaccia grafica (ad es. `react`, `react-dom`, hook di React).
  - Dipendenze esterne di stato, rete o persistenza (ad es. `firebase`, `firestore`, `socket.io`, `express`).
  - Oggetti globali legati all'ambiente browser o Node (come `window`, `document`, `localStorage`).
- **Immutabilità dello Stato di Gioco:** Le funzioni del motore non devono mai mutare gli oggetti passati come parametro (mazzi, mani, carte sul tavolo). Ogni calcolo o transizione di turno deve restituire nuove istanze immutabili o strutture clonate (pattern a funzioni pure).

### 1.2 ⚡ Dogma della Velocità e Reattività di Gioco (Performance-First & Network Resilience)

- **Priorità Assoluta della Velocità di Gioco:** Qualsiasi implementazione, modifica architetturale o nuova funzionalità DEVE avere come priorità vincolante e non negoziabile la velocità di gioco e l'immediatezza della risposta al tocco dell'utente.
- **Divieto Categorico di Regressioni di Fluidità:** È fatto espresso e assoluto divieto di introdurre implementazioni, animazioni bloccanti, overhead di serializzazione o chiamate di rete sincrone che vadano a minare, rallentare o compromettere la velocità del gioco e la reattività dell'interfaccia, in qualsiasi condizione di connettività (inclusi scenari di latenza elevata, cambi di cella Wi-Fi/4G/5G, jitter o perdita parziale di pacchetti).
- **Latenza Percepita Zero (Optimistic UI Obbligatoria):** Ogni interazione del giocatore (giocata della carta, dichiarazione, voto di Dubito) deve fornire un feedback visivo istantaneo sulla UI (entro il frame di rendering, `< 16ms`), senza mai attendere il round-trip del server o del database. L'eventuale rifiuto della mossa va gestito tramite riconciliazione e rollback asincrono senza bloccare il flusso.
- **Tutela della Banda di Gioco:** La banda di rete deve essere riservata unicamente ai micro-payload essenziali dello stato di gioco. Nessun asset statico (grafiche delle carte, icone, suoni, stili, font) deve competere con i messaggi di partita in tempo reale, dovendo risiedere obbligatoriamente nella memoria cache locale del dispositivo.

---

## 2. 🇮🇹 Linee Guida di Nomenclatura e Tipizzazione

La lingua ufficiale del dominio di business, dei modelli di dati e della logica applicativa è l'**italiano**.

### 2.1 Regole di Denominazione

1. **Nomi di Tipi, Interfacce, Classi e Componenti (`PascalCase`):**
   - Utilizzare esclusivamente termini italiani corrispondenti al gioco.
   - _Esempi:_ `Carta`, `Seme`, `ManoGiocatore`, `StatoPartita`, `FaseGioco`, `TabellonePunteggio`, `TavoloGioco`.
2. **Nomi di Funzioni, Metodi e Variabili (`camelCase`):**
   - Esprimere l'azione o lo stato chiaramente in italiano.
   - _Esempi:_ `calcolaPunteggio`, `verificaLegittimitaPresa`, `mescolaMazzo`, `carteSulTavolo`, `giocatoreDiTurno`, `eSettebello`.
3. **Costanti e Configurazioni Immutabili (`MAIUSCOLO_SNAKE_CASE`):**
   - _Esempi:_ `PUNTI_PRIMIERA`, `SEMI`, `PUNTI_VITTORIA_PARTITA`, `TEMPO_FINESTRA_DUBITO_SECONDI`.
4. **Eventi di Dominio e Azioni:**
   - Denominare gli eventi e i messaggi in italiano aderente al contesto del gioco (ad es. `CALA_CARTA`, `DICHIARA_DUBITO`, `CONFERMA_PRESA`).

### 2.2 Tipizzazione Rigorosa (Strict TypeScript)

- **Divieto Assoluto di `any`:** È severamente vietato l'uso del tipo `any`. Tutte le strutture dati devono essere puntualmente tipizzate mediante `type` o `interface`.
- **Nessuna Evasione del Type Checker:** Vietato l'uso di asserzioni cieche (`as unknown as ...` o `// @ts-ignore` / `// @ts-expect-error`) a meno di strettissima necessità legata a terze parti e debitamente motivata da un commento critico.
- **Interoperabilità Retrocompatibile:** Laddove esistano layer legacy o ponti di compatibilità (ad es. `src/types/game.ts` o `src/engine/scopaRules.ts`), i tipi devono estendere o mappare fedelmente i modelli puri definiti in `src/logica/tipiGioco.ts`.

---

## 3. 🌿 Convenzioni Git (Rami e Commit in Italiano)

Per garantire tracciabilità, uniformità ed eleganza nello storico dei sorgenti, ogni interazione con Git deve essere formulata in lingua italiana.

### 3.1 Nomenclatura dei Rami (Branches)

I nomi dei rami devono adottare il formato:

```
<categoria>/<descrizione-in-kebab-case-in-italiano>
```

Categorie consentite:

- `funzionalita/...` (nuove caratteristiche o implementazioni)
- `correzione/...` (risoluzione di bug o regressioni)
- `manutenzione/...` (aggiornamenti dipendenze, refactoring, pulizia codice, CI/CD)
- `documentazione/...` (modifiche a file di documentazione e guide)
- `prestazioni/...` (ottimizzazioni di resa grafica o algoritmi)
- `test/...` (estensione o modifica suite di test)

_Esempi:_

- `funzionalita/nuova-animazione-ruspa`
- `correzione/calcolo-parita-primiera`
- `documentazione/aggiornamento-specifiche-regole`

### 3.2 Formato dei Messaggi di Commit

I messaggi di commit devono seguire la convenzione standard tradotta integralmente in italiano:

```
<tipo>(<ambito-opzionale>): <descrizione sintetica imperativa in italiano>
```

Tipi consentiti:

- `funzionalita`: per nuove funzionalità per l'utente finale.
- `correzione`: per correzioni di bug.
- `manutenzione`: per modifiche interne, refactoring che non mutano il comportamento o tool di build.
- `documentazione`: per modifiche alla sola documentazione.
- `stile`: per formattazione, spaziature o convenzioni stilistiche.
- `test`: per aggiunta o correzione di test.
- `prestazioni`: per modifiche volte a migliorare le prestazioni.

_Esempi:_

- `correzione(motore): sistemato calcolo delle prese a somma`
- `funzionalita(interfaccia): aggiunta schermata riassuntiva di fine manche`
- `documentazione: aggiunta costituzione del progetto e linee guida per agenti`

---

## 4. 📝 Politica sui Commenti e sui Registri (Log)

### 4.1 Commenti di Codice

- **Solo in Italiano Formale ed Essenziale:** Tutti i commenti devono essere redatti in lingua italiana corretta, sobria e professionale.
- **Divieto di Commenti Superflui o Ridondanti:** Non scrivere commenti che ripetono banalmente ciò che il codice già esprime (ad es. evitare `// incrementa il contatore` sopra `contatore++`).
- **Focus sui Passaggi Critici:** Commentare esclusivamente:
  - Regole di gioco particolari (ad es. divieto di punto Scopa all'ultima mano o su giocata Ruspa).
  - Casi limite (ad es. parità su denari e carte che assegna 0 punti).
  - Algoritmi non banali (calcolo combinatorio della Primiera, validazione bluff).
  - Decisioni architetturali o workaround per limitazioni di piattaforma.

### 4.2 Registri e Debug (`console.log`)

- **Divieto di Log Incontrollati in Produzione:** È vietato lasciare chiamate a `console.log`, `console.warn` o `console.debug` temporanee sparse nel codice di produzione.
- **Tracciamento Strutturato:** Se necessario tracciare eventi del motore o della rete, utilizzare un sistema di logging centralizzato o un logger condizionato dall'ambiente di sviluppo (`import.meta.env.DEV`).

---

## 5. 🤖 Protocollo Operativo per Agenti AI

Ogni agente o strumento di generazione automatica deve seguire rigorosamente questo protocollo operativo:

1. **Rispetto dello Scopo Assegnato (Scope Bounded):**
   - Modificare esclusivamente i file strettamente necessari per assolvere al compito richiesto.
   - Non eseguire refactoring opportunistici o riformattazioni di file non correlati al task.
2. **Integrità dei Test Esistenti:**
   - È categoricamente vietato cancellare, commentare o disabilitare test esistenti per far passare una build.
   - I test anti-regressione (`npm test` o `scripts/test-regole.ts`) devono rimanere sempre verdi (`PASS`). Se una nuova regola modifica legittimamente un comportamento, il test deve essere aggiornato con precisione e motivato.
3. **Stabilità delle Dipendenze (`package.json`):**
   - Non installare o aggiungere nuove librerie a `package.json` a meno che non vi sia una specifica e inequivocabile richiesta dell'utente.
   - Sfruttare esclusivamente le utility, librerie e API native già presenti nell'ecosistema del repository.
4. **Verifica Pre-Commit:**
   - Prima di considerare completato un intervento, verificare sempre:
     1. Assenza di errori di compilazione TypeScript (`npx tsc --noEmit`).
     2. Superamento della suite di test (`npm test`).

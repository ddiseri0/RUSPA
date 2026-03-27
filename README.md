# RUSPA - Variante Digitale della Scopa

Un Proof of Concept (PoC) in React per una nuova variante della Scopa chiamata **RUSPA**, che introduce meccaniche di *Bluff* e *Hidden Information*.

## Meccaniche di Gioco (Logiche Implementate)

Il gioco segue le regole classiche della Scopa ma con un twist moderno:
- **Presa Coperta**: Le carte giocate per le prese vengono calate coperte.
- **La Finestra di "DUBITO!"**: L'avversario ha una breve finestra di tempo (Challenge Window) per dubitare dell'onestà della mossa.
- **Risoluzione del Bluff**:
  - Se l'avversario dubita e il giocatore *diceva il falso*, il bluff fallisce: l'avversario guadagna punti Scopa, e la carta fasulla rimane scoperta sul tavolo (scarto forzato).
  - Se l'avversario dubita ma il giocatore *diceva il vero*, il bluff viene smascherato a vuoto: il giocatore incassa le carte prese e guadagna 1 punto Scopa bonus per essere stato falsamente accusato.
- **Regola RUSPA**: Giocare un Asso permette di fare "Ruspa" e catturare tutte le carte sul tavolo in un solo colpo, bypassando le regole di somma di base. L'avversario può dubitare di una dichiarazione Ruspa: se fingevi di avere l'Asso, pagherai fino a 2 punti di penalità!

### Punteggio di Fine Partita (Standard)
A fine round, la `state machine` calcola automaticamente i punti classici della Scopa:
1. **Carte**: Chi prende più di 20 carte ottiene 1 punto.
2. **Denari**: Chi prende più di 5 ori/denari ottiene 1 punto.
3. **Settebello**: Chi incassa il 7 di Denari ottiene 1 punto.
4. **Primiera**: Calcolata prendendo la miglior carta di ogni seme, convertita nel punteggio primiera (7=21, 6=18, Asso=16, 5=15...).
A tutti questi si sommano ovviamente tutte le "Scope" ottenute!

## Struttura del Codice (Clean Architecture)

Il progetto utilizza **React + TypeScript + Vite**. La codebase è altamente modulare per permettere in futuro il porting completo verso **React Native (iOS/Android) / Expo**.

### Backend Agnostico (La Mente)
- `src/engine/GameLogic.ts`: Contiene la logica di dominio puro (generazione mazzo napoletano a 40 carte, algoritmi di validazione somme/prese, e sistema di punteggio Primiera, Settebello ecc.).
- `src/engine/Bot.ts`: Un'Intelligenza Artificiale strategica. Calcola tutte le possibili permutazioni in mano, tenta i bluff matematicamente più ghiotti e ordina gli scarti per salvare gli Assi (Ruspa) o i Settebello dai momenti critici.
- `src/engine/types.ts`: Contratti Type-Safe condivisi ovunque.

### State Orchestrator (Il Master)
- `src/hooks/useGame.ts`: Orchestratore basato su `useReducer`. Fungendo da State Machine pura, incapsula le azioni (SUBMIT_MOVE, DOUBT, ACCEPT...) gestendo il rollback degli scarti o premiando le combo. Impossibile fare transizioni illegali.

### Frontend (L'Aspetto Premium)
- `src/App.tsx`: Interfaccia Utente reattiva costruita attorno a Flexbox/Grid. Coordina il turno con il Server AI.
- `src/components/Card.tsx`: Modulo UI visuale disaccoppiato che gestisce l'highlight e il targeting dell'IA.
- `src/index.css`: Styling Vanilla super curato. Uso intensivo di Glassmorphism, animazioni CSS hardware accelerated per dare il famoso succo (Game Feel/Juiciness) che un gioco di carte d'azzardo richiede, senza dover usare framework macroscopici.

## Avvio Sviluppo

```bash
npm install
npm run dev
```

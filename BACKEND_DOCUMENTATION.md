# Ruspa Backend Architecture

Questo documento descrive dettagliatamente l'architettura implementata per il server Socket.io di Ruspa, il funzionamento dello stato di gioco autoritativo e il flusso di risoluzione della meccanica di sfida ("DUBITO!").

## Struttura e Classi Modificate

L'implementazione è incentrata su un server Node.js puro (`server/index.ts`) che fa affidamento al 100% sulla logica di gioco contenuta in `src/engine/GameLogic.ts`.

### 1. `server/index.ts` (Core Server)
Questo file è il cuore del backend ed espone il WebSocket tramite la libreria Socket.io. Sostituisce la necessità di classi OOP con un semplice `Record<string, GameState>` per la gestione ottimizzata In-Memory di più stanze. Funzioni chiavi:

* **`sanitizeState(gameState, playerId)`**: Questa funzione è un pilastro del sistema Anti-Cheat. Dato lo stato completo globale (`GameState`), estrae esclusivamente le informazioni pubbliche e vi inietta la mano privata del giocatore che l'ha richiesta. Tutte le carte private degli avversari vengono eliminate, e le carte giocate per un'eventuale presa in sospeso ("pendingMove") vengono offuscate con l'identificativo fittizio `{ id: "hidden" }`. In questo modo l'IP o le ispezioni di rete sul client diventano inutili per barare.
* **`broadcastState(roomId)`**: Funzione di utilità che si assicura di inviare a tutti i giocatori dentro una certa stanza lo stato ricalcolato e sanitizzato su misura per il loro ID.
* **`handleDubito(roomId, accuserId)`**: Risolutore scatenato quando il server riceve un Emit `dubito` da parte di un avversario durante la finestra di sfida. Esamina la mossa e l'integrità matematica della presa chiamando i metodi di utils di `GameLogic.ts`. In base alla correttezza, commina i punti Scopa / Ruspa e smista le carte nel mazzo scarti forzato o nella pescata del giocatore.

### 2. `src/engine/GameLogic.ts` (Game Utilities)
La logica preesistente è rimasta esattamente la stessa. Essendo una classe senza stato di utilità `export function...`, i metodi:
* `shuffle()` e `createDeck()` gestiscono la generazione pseudo-randomica del mazzo (risolta sul server).
* `isValidCapture()` e `isValidRuspa()` validano matematicamente la partita sul file server e dirimono la correttezza delle accuse "DUBITO!".

### 3. `src/engine/types.ts`
Esteso con due nuove interfacce per far combaciare client e server:
* `ClientGameState` e `ClientPlayerState`, per differenziare le interfacce previste lato Frontend da quelle Server. Esempio cardine: Il `ClientPlayerState` esposto ha solo `handCount` per conteggiare il mazzo avversario, ma perde del tutto ogni traccia dell'array di istanze delle carte.

## Flusso Partita (State Machine)

1. **IDLE (`join_room`)**: I client si connettono invocando un room code segreto tramite WebSocket. Se la stanza non esiste, il server fa da host e crea una stanza IDLE. Una volta che i giocatori in stanza diventano due, il server avvia la partita.
2. **Distribuzione Carte (`initGame` & `dealCards`)**: Il server avvia la partita mescolando e tracciando l'intero pool delle carte privatamente. Le 4 carte iniziali vanno sul `board` e ogni giocatore ne riceve 3 in base al `turnOrder`.
3. **Turno di Gioco (`PLAYER_MOVE`)**: Un client decide di fare una mossa, invia l'istanza giocata pura al server in `play_move`.
4. **Finestra Sfida (`CHALLENGE_WINDOW`)**:
   - Alla ricezione di un `play_move`, il server memorizza la mossa nella variabile volatile `pendingMove`.
   - Modifica lo stato in `CHALLENGE_WINDOW` ed innesca un timer interno di Node (5000ms), isolato tramite il reference dictionary `roomTimers[roomId]`.
   - Informa istantaneamente il client passivo della mossa.
5. **Risoluzione Mossa (`RESOLUTION`) & Timer**: 
   - **Scenario A (Timeout)**: Scaduti i 5 secondi senza obiezioni (nessun evento `dubito` in entrata), scatta la transizione. Il server esegue ciecamente la mossa a prescindere dal bluff, aggiorna gli array, processa catture e pulisce il pendingMove. Se le pani sono vuote attiva la distribuzione, quindi rimanda lo step al blocco `PLAYER_MOVE`.
   - **Scenario B (Obiezione)**: L'utente chiama `dubito`. La funzione `handleDubito` estirperà il `setTimeout` precedentemente schedulato, controllerà internamente se la `pendingMove` era una bufala (`isValidCapture() === false`) o meno assecondando le logiche di assegnazione penalità dei punti scopa/ruspa asimmetriche, completando dopodiché il round come di consueto.

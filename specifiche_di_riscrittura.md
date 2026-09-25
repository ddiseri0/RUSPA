# DIRETTIVA DI RISCRITTURA: Scopa Coperta Multiplayer

**STATO ATTUALE:** Ignorare le implementazioni precedenti. Il progetto deve essere riscritto da zero per quanto riguarda logica di stato e UI, mantenendo solo le regole del gioco.

**STACK TECNOLOGICO E DEPLOY:**
- **Frontend:** React (Singolo file `App.jsx` o struttura standard).
- **Stile:** Tailwind CSS (obbligatorio per replicare fedelmente la UI).
- **Backend/DB:** Firebase Firestore e Firebase Auth (anonimo) per il multiplayer in tempo reale.
- **Deploy:** Configurazione ottimizzata per Vercel (nessun server custom, solo chiamate dirette al DB Firebase).

---

## 🎨 LINEE GUIDA UI/UX (Riferimento: Stile "Offsuit")

L'interfaccia DEVE essere identica allo stile visivo dell'app di riferimento. Nessuna deviazione. Usa queste regole Tailwind:

1. **Sfondo e Colori Base:**
   - Sfondo dell'app: Nero assoluto (`bg-black`). Non usare blu scuro o grigio.
   - Sfondi secondari (pulsanti, box avatar): Grigio carbone scuro opaco (`bg-[#1C1C1E]` o `bg-zinc-900`).
   - Testo principale: Bianco puro. Testo secondario: Grigio chiaro.

2. **Tipografia:**
   - Font moderno, pulito, sans-serif (stile SF Pro).
   - Dimensioni generose per i numeri (es. punteggi molto grandi `text-5xl font-normal`).

3. **Le Carte (Elemento Centrale):**
   - Sfondo: Bianco puro (`bg-white`).
   - Bordo e Ombra: Niente bordi visibili, usare un'ombra morbida ma ampia (`shadow-2xl`).
   - Forma: Angoli estremamente arrotondati, quasi "squircle" (`rounded-[1.5rem]` o `rounded-3xl`).
   - Design Carta: Minimalista. Solo il numero e il seme al centro e agli angoli. Colori netti (rosso brillante, nero scuro, azzurro, verde) per i semi napoletani.

4. **Pulsanti (Azioni e Dubito):**
   - Forma a "pillola" o rettangoli molto smussati (`rounded-3xl` o `rounded-full`).
   - Colore: Grigio scuro opaco (`bg-zinc-900`) senza bordi.
   - Per il bottone di conferma/giocata principale: Valutare un bianco puro con testo nero per massimo contrasto.

5. **Box Giocatori / Avatar:**
   - Quadrati con angoli molto arrotondati (`rounded-3xl`), sfondo grigio scuro (`bg-zinc-900`).
   - Disposizione a griglia pulita.

6. **Lobby / Tornei (Sezione Iniziale):**
   - Box per le stanze con gradienti pastello molto morbidi e luminosi (es. `bg-gradient-to-br from-teal-100 to-blue-200`) su sfondo nero. Testo scuro all'interno del box sfumato.

---

## ⚙️ LOGICA DEL GIOCO (Scopa Variante "Coperta")

1. **Stanze Multiplayer:** Generazione ID stanza, ingresso tramite codice, lobby di attesa (1v1 o 2v2).
2. **Gameplay Base:** Turnazione classica, carte in mano (3), carte a terra (4 iniziali). Punti della Scopa classica.
3. **Presa Coperta:** Ogni carta giocata va mostrata a faccia in giù sul tavolo.
4. **Meccanica "Dubito":** 
   - Finestra di tempo ad ogni mossa in cui l'avversario (o la squadra avversaria) può premere "Dubito".
   - In 2v2: Votazione di squadra.
   - Risoluzione: Se chi dubita ha ragione (era un bluff/mossa non valida), prende i punti/carte. Altrimenti la penalità va a lui.
5. **Asso "Ruspa":** Prende tutto il tavolo, giocato coperto (può essere dubitato).
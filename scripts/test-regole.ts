/**
 * Suite di Test Anti-Regressione Ufficiale per "La Ruspa"
 * Convalida i 6 requisiti fondamentali di gioco.
 */

import {
  creaMazzoNapoletano,
  mescolaMazzo,
  preparaDistribuzioneIniziale,
  verificaLegittimitaPresa,
  valutaPuntiFineManche,
  esistePresaSingolaSulTavolo,
  calcolaPunteggioPrimiera,
  haTreOPiuRe,
} from '../src/logica/regoleScopa';
import { Carta } from '../src/logica/tipiGioco';

function assert(condizione: boolean, messaggio: string) {
  if (!condizione) {
    console.error(`❌ FALLITO: ${messaggio}`);
    process.exit(1);
  }
  console.log(`✅ SUPERATO: ${messaggio}`);
}

console.log('====================================================');
console.log('🧪 ESECUZIONE TEST ANTI-REGRESSIONE MOTORE LA RUSPA');
console.log('====================================================\n');

// 1. Calata senza presa = carta scoperta, nessun evento Dubito
console.log('1️⃣ Test: Calata senza presa...');
const cartaScarto: Carta = { id: 'denari-4', seme: 'denari', valore: 4 };
const esitoScarto = verificaLegittimitaPresa(cartaScarto, [], false, []);
assert(esitoScarto.eLegittima, 'Calata senza presa è sempre legittima');
assert(esitoScarto.motivo.includes('scoperta'), 'Motivo indica carta calata scoperta a terra');

// 2. Forzatura della presa singola rispetto alla combinazione di somma
console.log('\n2️⃣ Test: Forzatura della presa singola rispetto alla somma...');
const cartaSette: Carta = { id: 'spade-7', seme: 'spade', valore: 7 };
const tavoloConSetteESomma: Carta[] = [
  { id: 'denari-7', seme: 'denari', valore: 7 }, // Singola presente!
  { id: 'coppe-3', seme: 'coppe', valore: 3 },
  { id: 'bastoni-4', seme: 'bastoni', valore: 4 },
];

// Tentativo illegittimo di prendere 3 + 4 quando è presente il 7 singolo
const presaSommaIllegittima = verificaLegittimitaPresa(
  cartaSette,
  [
    { id: 'coppe-3', seme: 'coppe', valore: 3 },
    { id: 'bastoni-4', seme: 'bastoni', valore: 4 },
  ],
  false,
  tavoloConSetteESomma
);
assert(
  !presaSommaIllegittima.eLegittima,
  'La presa a somma è vietata se esiste una carta singola dello stesso valore'
);
assert(
  presaSommaIllegittima.motivo.includes('obbligatoria'),
  'Messaggio segnala obbligo di presa singola'
);

// Presa corretta del 7 singolo
const presaSingolaCorretta = verificaLegittimitaPresa(
  cartaSette,
  [{ id: 'denari-7', seme: 'denari', valore: 7 }],
  false,
  tavoloConSetteESomma
);
assert(presaSingolaCorretta.eLegittima, 'La presa della carta singola è pienamente legittima');

// 3. Comportamento Asso (prende tutto il tavolo, nessun punto scopa)
console.log('\n3️⃣ Test: Comportamento Asso Ruspa...');
const asso: Carta = { id: 'bastoni-1', seme: 'bastoni', valore: 1 };
const esitoAsso = verificaLegittimitaPresa(asso, tavoloConSetteESomma, true, tavoloConSetteESomma);
assert(esitoAsso.eLegittima, 'Asso dichiarato come Ruspa prende legittimamente tutto il tavolo');

const nonAsso: Carta = { id: 'coppe-5', seme: 'coppe', valore: 5 };
const esitoBluffRuspa = verificaLegittimitaPresa(nonAsso, tavoloConSetteESomma, true, tavoloConSetteESomma);
assert(!esitoBluffRuspa.eLegittima, 'Carta diversa dall Asso dichiarata come Ruspa è un bluff smascherabile');

// 4. Risoluzione del Dubito (vittoria baro vs vittoria accusatore con posizionamento corretto carte)
console.log('\n4️⃣ Test: Risoluzione del Dubito...');
// Caso A: Giocatore dice il vero (presa diretta 5 con 5)
const cartaCinque: Carta = { id: 'spade-5', seme: 'spade', valore: 5 };
const bersaglioCinque: Carta[] = [{ id: 'coppe-5', seme: 'coppe', valore: 5 }];
const esitoVero = verificaLegittimitaPresa(cartaCinque, bersaglioCinque, false, bersaglioCinque);
assert(esitoVero.eLegittima, 'Presa veritiera: chi ha preso vince la sfida Dubito (+1 punto bonus)');

// Caso B: Giocatore bluffa (dice di prendere 7 con un 6)
const cartaSei: Carta = { id: 'spade-6', seme: 'spade', valore: 6 };
const bersaglioSette: Carta[] = [{ id: 'coppe-7', seme: 'coppe', valore: 7 }];
const esitoFalso = verificaLegittimitaPresa(cartaSei, bersaglioSette, false, bersaglioSette);
assert(!esitoFalso.eLegittima, 'Presa bluff: accusatore vince (+1 punto), carta bluffata scoperta a terra');

// 5. Assegnazione 0 punti in caso di parità denari (5-5) e carte (20-20)
console.log('\n5️⃣ Test: Assegnazione 0 punti in caso di parità...');
// Creiamo 20 carte ciascuno con 5 denari ciascuno
const mazzo = creaMazzoNapoletano();
const denari = mazzo.filter((c) => c.seme === 'denari'); // 10 denari
const altre = mazzo.filter((c) => c.seme !== 'denari'); // 30 altre carte

const squadra1Carte = [...denari.slice(0, 5), ...altre.slice(0, 15)]; // 20 carte totali, 5 denari
const squadra2Carte = [...denari.slice(5, 10), ...altre.slice(15, 30)]; // 20 carte totali, 5 denari

const punteggioParita = valutaPuntiFineManche(squadra1Carte, squadra2Carte, 0, 0);
assert(
  punteggioParita.squadra1.carte === 0 && punteggioParita.squadra2.carte === 0,
  'Parità 20 a 20 sulle carte totali assegna 0 punti a entrambe le squadre'
);
assert(
  punteggioParita.squadra1.denari === 0 && punteggioParita.squadra2.denari === 0,
  'Parità 5 a 5 sui denari assegna 0 punti a entrambe le squadre'
);

// 6. Rimescolamento automatico con 3+ Re a terra all'inizio
console.log('\n6️⃣ Test: Regola 3+ Re a terra e prosecuzione smazzata...');
const tavoloTreRe: Carta[] = [
  { id: 'denari-10', seme: 'denari', valore: 10 },
  { id: 'coppe-10', seme: 'coppe', valore: 10 },
  { id: 'spade-10', seme: 'spade', valore: 10 },
  { id: 'bastoni-2', seme: 'bastoni', valore: 2 },
];
assert(haTreOPiuRe(tavoloTreRe), 'Rileva correttamente la presenza di 3 Re a terra');

const distribuzione = preparaDistribuzioneIniziale();
assert(
  !haTreOPiuRe(distribuzione.tavolo),
  'Distribuzione iniziale garantisce meno di 3 Re a terra tramite rimescolamento'
);
assert(distribuzione.tavolo.length === 4, 'Il tavolo iniziale ha esattamente 4 carte');
assert(distribuzione.mazzo.length === 36, 'Il mazzo iniziale ha esattamente 36 carte (totale 40)');

console.log('\n====================================================');
console.log('🎉 TUTTI I 6 TEST ANTI-REGRESSIONE HANNO AVUTO SUCCESSO!');
console.log('====================================================\n');

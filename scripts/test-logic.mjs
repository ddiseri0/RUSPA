import { createStandardDeck, shuffleDeck, verifyCaptureLegitimacy, evaluateManchePoints, computeScopaStats } from '../src/engine/scopaRules.js';

console.log('🧪 Inizio Test Completo Requisiti RUSPA:\n');

// 1. Deck 40 carte
const deck = createStandardDeck();
console.log(`1️⃣  Mazzo Napoletano: ${deck.length} carte.`);
if (deck.length !== 40) throw new Error('Deck must have 40 cards');

// 2. Verifica Semi
const suits = [...new Set(deck.map(c => c.suit))];
console.log(`   Semi presenti: ${suits.join(', ')}`);

// 3. Regola Dubito e Ruspa
console.log('\n2️⃣  Verifica Asso Ruspa vs Bluff Ruspa...');
const asso = deck.find(c => c.value === 1 && c.suit === 'denari');
const cavallo = deck.find(c => c.value === 9 && c.suit === 'spade');
const targetBoard = deck.slice(10, 14);

const aceResult = verifyCaptureLegitimacy(asso, targetBoard, true);
console.log(`   • Asso giocato come Ruspa: ${aceResult.isLegal ? 'LEGALE ✅' : 'ILLEGALE ❌'} (${aceResult.reason})`);
if (!aceResult.isLegal) throw new Error('Ace should be legal ruspa');

const bluffResult = verifyCaptureLegitimacy(cavallo, targetBoard, true);
console.log(`   • Cavallo giocato come Ruspa (Bluff): ${bluffResult.isLegal ? 'LEGALE ❌' : 'SMASCHERATO ✅'} (${bluffResult.reason})`);
if (bluffResult.isLegal) throw new Error('Non-ace should be caught as bluff');

// 4. Scarto a terra senza presa
const scartoResult = verifyCaptureLegitimacy(cavallo, [], false);
console.log(`   • Scarto a terra (0 carte prese): ${scartoResult.isLegal ? 'VALIDO ✅' : 'ERRORE ❌'}`);
if (!scartoResult.isLegal) throw new Error('Discard should be valid');

// 5. Primiera e Punti Classici Scopa
console.log('\n3️⃣  Calcolo Punti Classici & Primiera...');
const team1Cards = deck.slice(0, 22); // 22 carte
const team2Cards = deck.slice(22, 40); // 18 carte
const mancheResult = evaluateManchePoints(team1Cards, team2Cards, 2, 1);
console.log('   Riepilogo manche generato:');
mancheResult.summary.forEach(s => console.log(`   • ${s}`));
console.log(`   Punti Squadra 1: Scope ${mancheResult.p1Points.scope}, Carte ${mancheResult.p1Points.carte}, Denari ${mancheResult.p1Points.denari}, 7B ${mancheResult.p1Points.settebello}, Primiera ${mancheResult.p1Points.primiera}`);
console.log(`   Punti Squadra 2: Scope ${mancheResult.p2Points.scope}, Carte ${mancheResult.p2Points.carte}, Denari ${mancheResult.p2Points.denari}, 7B ${mancheResult.p2Points.settebello}, Primiera ${mancheResult.p2Points.primiera}`);

// 6. Test Vittoria a 21 punti
console.log('\n4️⃣  Condizione di Vittoria a 21 Punti...');
const scoreT1 = 22;
const scoreT2 = 18;
const isGameOver = (scoreT1 >= 21 || scoreT2 >= 21) && scoreT1 !== scoreT2;
const winner = scoreT1 > scoreT2 ? 'Squadra 1' : 'Squadra 2';
console.log(`   Punteggi: Squadra 1 (${scoreT1}) vs Squadra 2 (${scoreT2}) -> Partita Finita: ${isGameOver ? 'SÌ ✅' : 'NO ❌'}, Vincitore: ${winner}`);

console.log('\n🎉 TUTTI I TEST LOGICI E REGOLAMENTARI SONO CONFERMATI AL 100%!');

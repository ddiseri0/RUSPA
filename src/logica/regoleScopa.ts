/**
 * Logica di Dominio Pura per "La Ruspa" (Scopa Tradizionale con Meccaniche Bluff e Dubito).
 * Codice pulito, isolato da React, con nomenclatura 100% in italiano.
 */

import { Carta, Seme, StatisticheScopaLive, EsitoPuntiManche } from './tipiGioco';

export const SEMI: Seme[] = ['denari', 'coppe', 'spade', 'bastoni'];

/**
 * Nomi in italiano dei semi napoletani
 */
export const NOMI_SEMI: Record<Seme, string> = {
  denari: 'Denari',
  coppe: 'Coppe',
  spade: 'Spade',
  bastoni: 'Bastoni',
};

/**
 * Valori tradizionali della Primiera (Settanta):
 * 7=21, 6=18, Asso=16, 5=15, 4=14, 3=13, 2=12, Figure (8, 9, 10)=10
 */
export const PUNTI_PRIMIERA: Record<number, number> = {
  7: 21,
  6: 18,
  1: 16,
  5: 15,
  4: 14,
  3: 13,
  2: 12,
  8: 10,
  9: 10,
  10: 10,
};

/**
 * Crea un mazzo completo da 40 carte napoletane.
 */
export function creaMazzoNapoletano(): Carta[] {
  const mazzo: Carta[] = [];
  for (const seme of SEMI) {
    for (let valore = 1; valore <= 10; valore++) {
      mazzo.push({
        id: `${seme}-${valore}`,
        seme,
        valore,
        eSettebello: seme === 'denari' && valore === 7,
        suit: seme,
        value: valore,
        isSettebello: seme === 'denari' && valore === 7,
      });
    }
  }
  return mazzo;
}

/**
 * Mescola il mazzo (algoritmo di Fisher-Yates).
 */
export function mescolaMazzo(mazzo: Carta[]): Carta[] {
  const mescolato = [...mazzo];
  for (let i = mescolato.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mescolato[i], mescolato[j]] = [mescolato[j], mescolato[i]];
  }
  return mescolato;
}

/**
 * Verifica se tra le carte a terra ci sono 3 o 4 Re (valore 10).
 * Secondo la regola ufficiale, se all'inizio ci sono 3 o 4 Re, la smazzata è nulla.
 */
export function haTreOPiuRe(carte: Carta[]): boolean {
  return carte.filter((c) => (c.valore ?? c.value) === 10).length >= 3;
}

/**
 * Prepara la smazzata iniziale:
 * - 4 carte a terra
 * - Rimescolamento automatico in caso di 3 o 4 Re tra le carte iniziali a terra.
 */
export function preparaDistribuzioneIniziale(): {
  mazzo: Carta[];
  tavolo: Carta[];
} {
  let mazzo: Carta[] = [];
  let tavolo: Carta[] = [];
  let tentativi = 0;

  do {
    mazzo = mescolaMazzo(creaMazzoNapoletano());
    tavolo = mazzo.splice(0, 4);
    tentativi++;
  } while (haTreOPiuRe(tavolo) && tentativi < 100);

  return { mazzo, tavolo };
}

/**
 * Verifica se sul tavolo esiste una carta singola di valore identico a quello giocato.
 * REGOLA UFFICIALE SCOPA: Se è presente una carta singola dello stesso valore,
 * è obbligatorio prendere la carta singola rispetto a una combinazione di somma.
 */
export function esistePresaSingolaSulTavolo(valoreCarta: number, tavolo: Carta[]): boolean {
  return tavolo.some((c) => (c.valore ?? c.value) === valoreCarta);
}

/**
 * Valida la legittimità di una presa secondo le regole ufficiali di Scopa e La Ruspa.
 */
export function verificaLegittimitaPresa(
  cartaGiocata: Carta,
  carteBersaglio: Carta[],
  eRuspa: boolean,
  tavoloAttuale: Carta[] = []
): {
  eLegittima: boolean;
  motivo: string;
} {
  const valoreGiocata = cartaGiocata.valore ?? cartaGiocata.value;
  const semeGiocata = cartaGiocata.seme ?? cartaGiocata.suit;
  const nomeSeme = NOMI_SEMI[semeGiocata] || semeGiocata;

  // Caso 1: Asso Ruspa
  if (eRuspa) {
    if (valoreGiocata === 1) {
      return {
        eLegittima: true,
        motivo: "Mossa Asso Ruspa legittima: l'Asso pulisce l'intero tavolo!",
      };
    }
    return {
      eLegittima: false,
      motivo: `BLUFF SCOPERTO: Ha dichiarato Ruspa ma ha giocato un ${valoreGiocata} di ${nomeSeme}!`,
    };
  }

  // Caso 2: Scarto a terra senza presa
  if (carteBersaglio.length === 0) {
    return {
      eLegittima: true,
      motivo: 'Carta calata scoperta a terra senza presa.',
    };
  }

  // Caso 3: Presa singola
  if (carteBersaglio.length === 1) {
    const valBersaglio = carteBersaglio[0].valore ?? carteBersaglio[0].value;
    if (valBersaglio === valoreGiocata) {
      return {
        eLegittima: true,
        motivo: `Presa diretta di valore ${valoreGiocata} valida.`,
      };
    }
    return {
      eLegittima: false,
      motivo: `BLUFF SCOPERTO: Ha tentato di prendere un ${valBersaglio} con un ${valoreGiocata} di ${nomeSeme}!`,
    };
  }

  // Caso 4: Presa a somma (> 1 carta bersaglio)
  // REGOLA PRIORITÀ PRESA SINGOLA:
  // Se sul tavolo è presente una carta singola di valore identico a quello giocato,
  // la presa a somma è VIETATA.
  if (esistePresaSingolaSulTavolo(valoreGiocata, tavoloAttuale)) {
    return {
      eLegittima: false,
      motivo: `PRESA NON VALIDA: Sul tavolo è presente una carta singola di valore ${valoreGiocata}. La regola ufficiale impone la presa singola obbligatoria!`,
    };
  }

  const sommaBersagli = carteBersaglio.reduce((acc, c) => acc + (c.valore ?? c.value), 0);
  if (sommaBersagli === valoreGiocata) {
    return {
      eLegittima: true,
      motivo: `Presa a somma valida: somma ${sommaBersagli} = valore giocato ${valoreGiocata}.`,
    };
  }

  return {
    eLegittima: false,
    motivo: `BLUFF SCOPERTO: La somma delle carte selezionate (${sommaBersagli}) non corrisponde al valore reale (${valoreGiocata})!`,
  };
}

/**
 * Calcola il punteggio della Primiera (Settanta) per un insieme di carte catturate.
 */
export function calcolaPunteggioPrimiera(carte: Carta[]): number {
  const migliorePerSeme: Record<Seme, number> = {
    denari: 0,
    coppe: 0,
    spade: 0,
    bastoni: 0,
  };

  for (const carta of carte) {
    const val = carta.valore ?? carta.value;
    const s = carta.seme ?? carta.suit;
    const punti = PUNTI_PRIMIERA[val] || 0;
    if (punti > migliorePerSeme[s]) {
      migliorePerSeme[s] = punti;
    }
  }

  return (
    migliorePerSeme.denari +
    migliorePerSeme.coppe +
    migliorePerSeme.spade +
    migliorePerSeme.bastoni
  );
}

/**
 * Calcola le statistiche live per il tabellone di una squadra.
 */
export function calcolaStatisticheLive(carte: Carta[]): StatisticheScopaLive {
  const conteggioCarte = carte.length;
  const conteggioDenari = carte.filter((c) => (c.seme ?? c.suit) === 'denari').length;
  const haSettebello = carte.some(
    (c) => (c.seme ?? c.suit) === 'denari' && (c.valore ?? c.value) === 7
  );
  const punteggioPrimiera = calcolaPunteggioPrimiera(carte);

  return {
    conteggioCarte,
    conteggioDenari,
    haSettebello,
    punteggioPrimiera,
  };
}

/**
 * Etichetta testuale in italiano per le carte napoletane.
 */
export function ottieniEtichettaCarta(valore: number): string {
  switch (valore) {
    case 1:
      return 'Asso';
    case 8:
      return 'Donna';
    case 9:
      return 'Cavallo';
    case 10:
      return 'Re';
    default:
      return valore.toString();
  }
}

/**
 * Valutazione finale dei punti della smazzata (Manche):
 * Assegnati solo dopo l'esaurimento di tutte le 40 carte.
 * - Scope: conteggio in tempo reale (+ eventuali punti da Dubito).
 * - Settebello: 1 pt a chi ha il 7 di Denari.
 * - Carte a Denari: 1 pt a chi ha >5 denari. Se 5 a 5: 0 pt (parità).
 * - Carte a Lungo: 1 pt a chi ha >20 carte. Se 20 a 20: 0 pt (parità).
 * - Primiera / Settanta: 1 pt a chi ha punteggio più alto. Se parità: 0 pt.
 */
export function valutaPuntiFineManche(
  carteSquadra1: Carta[],
  carteSquadra2: Carta[],
  scopeSquadra1: number,
  scopeSquadra2: number
): EsitoPuntiManche {
  const s1 = calcolaStatisticheLive(carteSquadra1);
  const s2 = calcolaStatisticheLive(carteSquadra2);

  // Carte a Lungo (> 20; parità 20-20 assegna 0 punti)
  const p1Carte = s1.conteggioCarte > s2.conteggioCarte ? 1 : 0;
  const p2Carte = s2.conteggioCarte > s1.conteggioCarte ? 1 : 0;

  // Denari (> 5; parità 5-5 assegna 0 punti)
  const p1Denari = s1.conteggioDenari > s2.conteggioDenari ? 1 : 0;
  const p2Denari = s2.conteggioDenari > s1.conteggioDenari ? 1 : 0;

  // Settebello (7 di denari)
  const p1Settebello = s1.haSettebello ? 1 : 0;
  const p2Settebello = s2.haSettebello ? 1 : 0;

  // Primiera (Settanta; parità assegna 0 punti)
  const p1Primiera = s1.punteggioPrimiera > s2.punteggioPrimiera ? 1 : 0;
  const p2Primiera = s2.punteggioPrimiera > s1.punteggioPrimiera ? 1 : 0;

  const totaleAggiunto1 = scopeSquadra1 + p1Carte + p1Denari + p1Settebello + p1Primiera;
  const totaleAggiunto2 = scopeSquadra2 + p2Carte + p2Denari + p2Settebello + p2Primiera;

  const riepilogo: string[] = [];
  if (p1Carte) riepilogo.push(`Carte: Squadra 1 (${s1.conteggioCarte} vs ${s2.conteggioCarte})`);
  else if (p2Carte) riepilogo.push(`Carte: Squadra 2 (${s2.conteggioCarte} vs ${s1.conteggioCarte})`);
  else riepilogo.push(`Carte: Parità (${s1.conteggioCarte} - ${s2.conteggioCarte}, 0 pt)`);

  if (p1Denari) riepilogo.push(`Denari: Squadra 1 (${s1.conteggioDenari} vs ${s2.conteggioDenari})`);
  else if (p2Denari) riepilogo.push(`Denari: Squadra 2 (${s2.conteggioDenari} vs ${s1.conteggioDenari})`);
  else riepilogo.push(`Denari: Parità (${s1.conteggioDenari} - ${s2.conteggioDenari}, 0 pt)`);

  if (p1Settebello) riepilogo.push('Settebello: Squadra 1 (★ 7 Denari)');
  else if (p2Settebello) riepilogo.push('Settebello: Squadra 2 (★ 7 Denari)');

  if (p1Primiera) riepilogo.push(`Primiera: Squadra 1 (${s1.punteggioPrimiera} vs ${s2.punteggioPrimiera} pt)`);
  else if (p2Primiera) riepilogo.push(`Primiera: Squadra 2 (${s2.punteggioPrimiera} vs ${s1.punteggioPrimiera} pt)`);
  else riepilogo.push(`Primiera: Parità (${s1.punteggioPrimiera} pt, 0 pt)`);

  return {
    squadra1: {
      scope: scopeSquadra1,
      carte: p1Carte,
      carteCount: s1.conteggioCarte,
      denari: p1Denari,
      denariCount: s1.conteggioDenari,
      settebello: p1Settebello,
      haSettebello: s1.haSettebello,
      primiera: p1Primiera,
      primieraScore: s1.punteggioPrimiera,
      totaleAggiunto: totaleAggiunto1,
    },
    squadra2: {
      scope: scopeSquadra2,
      carte: p2Carte,
      carteCount: s2.conteggioCarte,
      denari: p2Denari,
      denariCount: s2.conteggioDenari,
      settebello: p2Settebello,
      haSettebello: s2.haSettebello,
      primiera: p2Primiera,
      primieraScore: s2.punteggioPrimiera,
      totaleAggiunto: totaleAggiunto2,
    },
    riepilogo,
  };
}

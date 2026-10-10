/**
 * Registro centralizzato condizionato dall'ambiente: in produzione gli avvisi sono silenziati
 * per non penalizzare il main thread dei dispositivi mobili (AGENTS.md §4.2).
 */
export function registraAvviso(...argomenti: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...argomenti);
  }
}

export function registraErrore(...argomenti: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error(...argomenti);
  }
}

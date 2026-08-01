/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 * Toda a massa de dados de demonstração é derivada de sementes fixas,
 * garantindo que servidor e cliente rendam exatamente os mesmos valores.
 */
export function createRng(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Inteiro em [min, max] (inclusivo). */
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** Número em [min, max). */
    float(min: number, max: number) {
      return next() * (max - min) + min;
    },
    /** true com probabilidade p. */
    chance(p: number) {
      return next() < p;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    /** Escolha ponderada: pesos paralelos à lista. */
    weighted<T>(items: readonly T[], weights: readonly number[]): T {
      const total = weights.reduce((sum, w) => sum + w, 0);
      let roll = next() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export interface Quote {
  label: string;
  valet: number;
  self: number;
}

export interface Comparison {
  label: string;
  valet: number;
  self: number;
  /** How much dearer self-storage is than valet, as a percentage of the valet price. */
  selfHigherPct: number;
  /** How much cheaper valet is than self-storage, as a percentage of the self-storage price. */
  valetLowerPct: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** The two directions are different numbers: 40% dearer is not 40% cheaper. */
export function compare(q: Quote): Comparison {
  const gap = q.self - q.valet;
  return {
    label: q.label,
    valet: q.valet,
    self: q.self,
    selfHigherPct: round1((gap / q.valet) * 100),
    valetLowerPct: round1((gap / q.self) * 100),
  };
}

const vnd = (n: number): string => n.toLocaleString('en-US');

/** Text handed to the model. In production this would be the output of a live pricing tool. */
export function describe(c: Comparison): string {
  return `${c.label}: valet ${vnd(c.valet)} VND, self-storage ${vnd(c.self)} VND per month. Self-storage is ${c.selfHigherPct}% higher than valet; valet is ${c.valetLowerPct}% lower than self-storage.`;
}

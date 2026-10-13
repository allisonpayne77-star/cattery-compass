// Cattery Manager — cat colour genetics engine (scratch mode, nothing saved)
// Loci: O (X-linked red), B (black series), D (dilution), A (agouti),
//       T (tabby pattern), S (white spotting), W (dominant white),
//       C (colourpoint), I (silver inhibitor)
// Red is X-linked: sex is drawn first, then colour resolved by sex.

export type Locus = "B" | "D" | "A" | "T" | "S" | "W" | "C" | "I";
export const LOCI: Locus[] = ["B", "D", "A", "T", "S", "W", "C", "I"];

// Alleles in dominance order, most dominant first
export const ALLELES: Record<Locus, string[]> = {
  B: ["B", "b", "b1"],
  D: ["D", "d"],
  A: ["A", "a"],
  T: ["Ta", "Mc", "mc"],
  S: ["S", "s"],
  W: ["W", "w"],
  C: ["C", "cs"],
  I: ["I", "i"],
};

export const ALLELE_LABEL: Record<string, string> = {
  B: "black", b: "chocolate", b1: "cinnamon",
  D: "dense", d: "dilute",
  A: "tabby (agouti)", a: "solid (non-agouti)",
  Ta: "ticked", Mc: "mackerel", mc: "classic",
  S: "white spotting", s: "no white spotting",
  W: "dominant white", w: "not white",
  C: "full colour", cs: "colourpoint",
  I: "silver", i: "non-silver",
};

export type Breed = { id: string; name: string; ems: string; allowed: Record<Locus, string[]> };

const ALL = ALLELES;
const b = (id: string, name: string, ems: string, o: Partial<Record<Locus, string[]>>): Breed =>
  ({ id, name, ems, allowed: { ...ALL, ...o } });
const noWhite = { S: ["s"], W: ["w"] };

// Which genes are possible in each breed. Kept broad where registries differ.
export const BREEDS: Breed[] = [
  b("mco", "Maine Coon", "MCO", { B: ["B"], T: ["Mc", "mc"], C: ["C"] }),
  b("aby", "Abyssinian", "ABY", { B: ["B", "b", "b1"], A: ["A"], T: ["Ta"], C: ["C"], ...noWhite }),
  b("bir", "Birman", "SBI", { B: ["B", "b"], T: ["Mc", "mc"], C: ["cs"], I: ["i"], ...noWhite }),
  b("bsh", "British Shorthair", "BSH", { T: ["Mc", "mc"] }),
  b("blh", "British Longhair", "BLH", { T: ["Mc", "mc"] }),
  b("crx", "Cornish Rex", "CRX", {}),
  b("drx", "Devon Rex", "DRX", {}),
  b("exo", "Exotic Shorthair", "EXO", { T: ["Mc", "mc"] }),
  b("nfo", "Norwegian Forest Cat", "NFO", { B: ["B"], T: ["Mc", "mc"], C: ["C"] }),
  b("osh", "Oriental Shorthair", "OSH", {}),
  b("per", "Persian / Himalayan", "PER", { T: ["Mc", "mc"] }),
  b("rag", "Ragdoll", "RAG", { B: ["B", "b"], T: ["Mc", "mc"], C: ["cs"], I: ["i"], W: ["w"] }),
  b("sfs", "Scottish Fold / Straight", "SFS", { T: ["Mc", "mc"] }),
  b("sia", "Siamese", "SIA", { T: ["Mc", "mc"], C: ["cs"], ...noWhite }),
  b("sib", "Siberian", "SIB", { B: ["B"], T: ["Mc", "mc"] }),
  b("som", "Somali", "SOM", { B: ["B", "b", "b1"], A: ["A"], T: ["Ta"], C: ["C"], ...noWhite }),
  b("sph", "Sphynx", "SPH", {}),
  b("any", "Other breed (all genes shown)", "", {}),
];

export type Sex = "F" | "M";
// A pair of alleles per locus; "?" means unknown
export type Pair = [string, string];
export type Genotype = { sex: Sex; O: string[]; loci: Record<Locus, Pair> };

// ---------- cross ----------
function sortPair(x: string, y: string, locus: Locus): Pair {
  const o = ALLELES[locus];
  return o.indexOf(x) <= o.indexOf(y) ? [x, y] : [y, x];
}

function crossLocus(dam: Pair, sire: Pair, locus: Locus): Map<string, number> {
  const out = new Map<string, number>();
  for (const x of dam) for (const y of sire) {
    const k = sortPair(x, y, locus).join("/");
    out.set(k, (out.get(k) || 0) + 0.25);
  }
  return out;
}

// dam O has 2 alleles, sire O has 1. Daughters get dam X + sire X; sons get dam X only.
function crossO(damO: string[], sireO: string[]) {
  const res: { sex: Sex; O: string[]; p: number }[] = [];
  for (const d of damO) {
    res.push({ sex: "F", O: [d, sireO[0]].sort((a, b) => (a === "O" ? -1 : b === "O" ? 1 : 0)), p: 0.25 });
    res.push({ sex: "M", O: [d], p: 0.25 });
  }
  return res;
}

// ---------- phenotype naming (Course 204 order) ----------
const EU_NAME: Record<string, [string, string]> = {
  B: ["black", "blue"], b: ["chocolate", "lilac"], b1: ["cinnamon", "fawn"],
};
const EU_EMS: Record<string, [string, string]> = { B: ["n", "a"], b: ["b", "c"], b1: ["o", "p"] };
const TORT_EMS: Record<string, [string, string]> = { B: ["f", "g"], b: ["h", "j"], b1: ["q", "r"] };
const POINT_NAME: Record<string, string> = { black: "seal", blue: "blue", chocolate: "chocolate", lilac: "lilac", cinnamon: "cinnamon", fawn: "fawn" };
const PATTERN: Record<string, [string, string]> = { Ta: ["ticked", "25"], Mc: ["mackerel", "23"], mc: ["classic", "22"] };

const dom = (p: string[], locus: Locus) => ALLELES[locus].find((a) => p.includes(a))!;

export type Phenotype = { group: string; name: string; ems: string };

export function phenotype(sex: Sex, O: string[], g: Record<Locus, string[]>, breedEms: string): Phenotype {
  const pre = breedEms ? breedEms + " " : "";
  if (g.W.includes("W")) return { group: "white", name: "white (dominant white hides the colour underneath)", ems: pre + "w" };

  const dil = !g.D.includes("D") ? 1 : 0;
  const b = dom(g.B, "B");
  const eu = EU_NAME[b][dil];
  const reds = O.filter((x) => x === "O").length;
  const kind = sex === "M" ? (reds ? "red" : "eu") : reds === 2 ? "red" : reds === 1 ? "tortie" : "eu";
  const agouti = g.A.includes("A");
  const silver = g.I.includes("I");
  const point = !g.C.includes("C");
  const white = g.S.includes("S") ? (g.S[0] === "S" && g.S[1] === "S" ? "high" : "some") : "none";
  const [patName, patCode] = PATTERN[dom(g.T, "T")];

  let group: string, colourWord: string, code: string;
  if (kind === "red") { group = dil ? "cream" : "red"; colourWord = group; code = dil ? "e" : "d"; }
  else if (kind === "tortie") { group = `${eu} tortie`; colourWord = eu; code = TORT_EMS[b][dil]; }
  else { group = eu; colourWord = eu; code = EU_EMS[b][dil]; }
  if (point && kind !== "red") colourWord = POINT_NAME[eu];

  const parts: string[] = [colourWord];
  if (silver) parts.push(agouti ? "silver" : "smoke");
  if (agouti) parts.push(patName, kind === "tortie" ? "torbie" : "tabby");
  else if (kind === "tortie") parts.push("tortie");
  if (point) parts.push("point");
  let name = parts.join(" ");
  if (white === "some") name += kind === "tortie" ? " with white (calico)" : " with white";
  if (white === "high") name += " — high white (van / harlequin)";

  let ems = pre + code + (silver ? "s" : "");
  if (white === "some") ems += " 03/09";
  if (white === "high") ems += " 01/02";
  if (agouti) ems += " " + patCode;
  if (point) ems += " 33";
  return { group, name, ems };
}

// ---------- prediction ----------
export type Outcome = Phenotype & { p: number; pF: number; pM: number };
export type Group = { group: string; p: number; outcomes: Outcome[] };

export function predict(dam: Genotype, sire: Genotype, breed: Breed): { groups: Group[]; outcomes: Outcome[] } {
  // distributions per locus
  const per = LOCI.map((l) => [...crossLocus(dam.loci[l], sire.loci[l], l).entries()]);
  const agg = new Map<string, Outcome>();

  for (const o of crossO(dam.O, sire.O)) {
    const rec = (i: number, g: Partial<Record<Locus, string[]>>, p: number) => {
      if (i === LOCI.length) {
        const ph = phenotype(o.sex, o.O, g as Record<Locus, string[]>, breed.ems);
        const key = ph.name;
        const cur = agg.get(key) || { ...ph, p: 0, pF: 0, pM: 0 };
        cur.p += p;
        if (o.sex === "F") cur.pF += p; else cur.pM += p;
        agg.set(key, cur);
        return;
      }
      for (const [k, q] of per[i]) rec(i + 1, { ...g, [LOCI[i]]: k.split("/") }, p * q);
    };
    rec(0, {}, o.p);
  }

  const outcomes = [...agg.values()].sort((a, b) => b.p - a.p);
  const gm = new Map<string, Group>();
  for (const oc of outcomes) {
    const g = gm.get(oc.group) || { group: oc.group, p: 0, outcomes: [] };
    g.p += oc.p; g.outcomes.push(oc); gm.set(oc.group, g);
  }
  return { groups: [...gm.values()].sort((a, b) => b.p - a.p), outcomes };
}

// ---------- unknowns ----------
// A parent entry per locus: visible allele (or "?" when masked) + second allele (or "?").
// Unknowns are NOT averaged — each is an assumption the breeder toggles between.
export type Unknown = { parent: "dam" | "sire"; locus: Locus; options: Pair[] };

export function optionsFor(locus: Locus, first: string, allowed: string[]): Pair[] {
  const firsts = first === "?" ? allowed : [first];
  const res: Pair[] = [];
  for (const f of firsts) {
    const idx = ALLELES[locus].indexOf(f);
    for (const s of allowed) if (ALLELES[locus].indexOf(s) >= idx) res.push([f, s]);
  }
  return res;
}

export function pairLabel(locus: Locus, [a, b]: Pair): string {
  if (a === b) return `${ALLELE_LABEL[a]} only (${a}/${b})`;
  return `${ALLELE_LABEL[a]}, carries ${ALLELE_LABEL[b]} (${a}/${b})`;
}

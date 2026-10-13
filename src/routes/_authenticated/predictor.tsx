import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ALLELES, ALLELE_LABEL as ENGINE_LABEL, BREEDS, LOCI, optionsFor, phenotype, predict,
  type Genotype, type Locus, type Pair,
} from "../../lib/colourGenetics";

export const Route = createFileRoute("/_authenticated/predictor")({ component: Predictor });

type Who = "dam" | "sire";

const ALLELE_LABEL: Record<string, string> = {
  ...ENGINE_LABEL,
  D: "not dilute (black, red)", d: "dilute (blue, cream)",
  A: "tabby (stripes, swirls or spots)", a: "solid (one colour, no tabby markings)",
  Mc: "mackerel (narrow stripes)", mc: "classic (bullseye swirls)", Ta: "ticked (no stripes on body)",
  S: "some white (white patches or paws)", s: "no white",
  I: "silver (white roots under the colour)", i: "not silver",
  W: "dominant white (all-white cat)", w: "not all-white",
};
// Short names for a hidden gene, used in "carries ..." wording
const HIDDEN: Record<string, string> = {
  b: "chocolate", b1: "cinnamon", d: "dilute", a: "solid", Mc: "mackerel", mc: "classic", cs: "colourpoint",
};
const SHORT: Record<string, string> = {
  B: "black", b: "chocolate", b1: "cinnamon", D: "black or red", d: "blue or cream", A: "tabby", a: "solid",
  Ta: "ticked", Mc: "mackerel", mc: "classic", C: "full colour", cs: "colourpoint",
};
// Silver, white spotting and dominant white show with one copy, so we ask how many copies instead
const COPIES: Locus[] = ["I", "S", "W"];
const COPY_NAME: Record<string, string> = { I: "silver", S: "white spotting", W: "dominant white" };
function pairLabel(l: Locus, [a, b]: Pair, opts: Pair[] = []): string {
  if (COPIES.includes(l)) {
    if (a !== ALLELES[l][0]) return `not ${COPY_NAME[l]}`;
    return a === b ? `${COPY_NAME[l]}: two copies (every kitten gets it)` : `${COPY_NAME[l]}: one copy (about half the kittens get it)`;
  }
  // Put the difference FIRST so phones that cut off long options still show it
  if (a !== b) return `Carries ${HIDDEN[b]} (looks ${SHORT[a]})`;
  const idx = (x: string) => ALLELES[l].indexOf(x);
  const lower = [...new Set(opts.flat())].filter((x) => idx(x) > idx(a));
  if (lower.length) return `Does not carry ${lower.map((x) => HIDDEN[x]).join(" or ")} (looks ${SHORT[a]})`;
  return `Shows ${SHORT[a]}`;
}
type Entry = { red: string; first: Record<Locus, string>; second: Record<Locus, string> };

const QUESTION: Record<Locus, string> = {
  B: "Black, chocolate or cinnamon", D: "Dilute or not", A: "Tabby or solid",
  T: "Tabby pattern", I: "Silver", S: "White spotting", W: "Dominant white", C: "Colourpoint",
};
const RED_OPTS: Record<Who, [string, string][]> = {
  dam: [["o/o", "Not red"], ["O/O", "Red / cream"], ["O/o", "Tortie / calico"]],
  sire: [["o", "Not red"], ["O", "Red / cream"]],
};
const COLOUR_NAME: Record<string, [string, string]> = {
  B: ["Black", "Blue"], b: ["Chocolate", "Lilac"], b1: ["Cinnamon", "Fawn"],
};
// Breeds where polydactyly (extra toes) is found and accepted
const POLY_BREEDS = ["mco", "any"];
// Chance a parent passes on the extra-toes gene: 0 = none, 0.5 = one copy, 1 = two copies, "?" = not sure
const POLY_OPTS: [string, string][] = [
  ["0", "No extra toes"], ["0.5", "Extra toes: one copy"], ["1", "Extra toes: two copies"], ["?", "Extra toes: not sure how many copies"],
];
function polyRange(d: string, s: string): [number, number] {
  const vals = (v: string) => (v === "?" ? [0.5, 1] : [Number(v)]);
  const all = vals(d).flatMap((a) => vals(s).map((b) => 1 - (1 - a) * (1 - b)));
  return [Math.min(...all), Math.max(...all)];
}
const RED_CAN_UNKNOWN: Locus[] = ["B", "A", "T"]; // loci that red or solid can hide

function blank(who: Who, allowed: Record<Locus, string[]>): Entry {
  const first = {} as Record<Locus, string>, second = {} as Record<Locus, string>;
  for (const l of LOCI) {
    const a = allowed[l];
    first[l] = l === "S" || l === "W" || l === "I" ? a[a.length - 1] : a[0];
    second[l] = first[l] === a[a.length - 1] ? first[l] : "?";
  }
  return { red: who === "dam" ? "o/o" : "o", first, second };
}

const pct = (p: number) => (p === 0 ? "—" : p < 0.01 ? (p * 100).toFixed(1) + "%" : Math.round(p * 1000) / 10 + "%");

function Predictor() {
  const [breedId, setBreedId] = useState("mco");
  const breed = BREEDS.find((b) => b.id === breedId)!;
  const [dam, setDam] = useState<Entry>(() => blank("dam", breed.allowed));
  const [sire, setSire] = useState<Entry>(() => blank("sire", breed.allowed));
  const [assume, setAssume] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [flat, setFlat] = useState(false);
  const [poly, setPoly] = useState<Record<Who, string>>({ dam: "0", sire: "0" });
  const polyBreed = POLY_BREEDS.includes(breedId);

  const changeBreed = (id: string) => {
    const b = BREEDS.find((x) => x.id === id)!;
    setBreedId(id); setDam(blank("dam", b.allowed)); setSire(blank("sire", b.allowed)); setAssume({}); setPoly({ dam: "0", sire: "0" });
  };

  const { unknowns, result, parents } = useMemo(() => {
    const unknowns: { key: string; who: Who; locus: Locus; options: Pair[] }[] = [];
    const build = (who: Who, e: Entry): Genotype => {
      const loci = {} as Record<Locus, Pair>;
      for (const l of LOCI) {
        const allowed = breed.allowed[l];
        let opts = optionsFor(l, e.first[l], allowed);
        if (e.second[l] !== "?" && e.first[l] !== "?") opts = [[e.first[l], e.second[l]]];
        if (opts.length === 1) { loci[l] = opts[0]; continue; }
        const key = `${who}.${l}`;
        unknowns.push({ key, who, locus: l, options: opts });
        const i = assume[key];
        loci[l] = opts[i !== undefined && i < opts.length ? i : opts.length - 1];
      }
      const O = e.red.split("/");
      return { sex: who === "dam" ? "F" : "M", O, loci };
    };
    const d = build("dam", dam), s = build("sire", sire);
    return { unknowns, result: predict(d, s, breed), parents: { dam: d, sire: s } };
  }, [dam, sire, assume, breed]);

  // Change what a parent visibly is; hidden copies reset to "not sure" where there's something to hide
  const setF = (e: Entry, ch: Partial<Record<Locus, string>>, second: Partial<Record<Locus, string>> = {}): Entry => {
    const first = { ...e.first }, sec = { ...e.second };
    for (const [l, nf] of Object.entries(ch) as [Locus, string][]) {
      const allowed = breed.allowed[l];
      if (!allowed.includes(nf) && nf !== "?") continue;
      const low = nf === "?" ? [] : allowed.filter((a) => ALLELES[l].indexOf(a) > ALLELES[l].indexOf(nf));
      first[l] = nf;
      sec[l] = second[l] ?? (low.length ? "?" : nf);
    }
    return { ...e, first, second: sec };
  };

  const Chips = ({ label, items, value, onPick }: { label: string; items: [string, string][]; value: string; onPick: (v: string) => void }) =>
    items.length < 2 ? null : (
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="flex flex-wrap gap-1.5">
          {items.map(([v, t]) => (
            <button key={v} type="button" onClick={() => onPick(v)} aria-pressed={value === v}
              className={`rounded-full border px-3 py-1 text-sm ${value === v ? "border-[#C8102E] bg-[#C8102E] text-white" : "bg-white dark:bg-background hover:bg-muted"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
    );

  const panel = (who: Who, e: Entry, set: (e: Entry) => void) => {
    const g = parents[who];
    const ph = phenotype(g.sex, g.O, g.loci as Record<Locus, string[]>, breed.ems);
    const al = breed.allowed;
    // colour chips from the black series x dilute that this breed allows
    const colours: [string, string][] = [];
    for (const bb of al.B) for (const dd of al.D) colours.push([`${bb}|${dd}`, COLOUR_NAME[bb][dd === "d" ? 1 : 0]]);
    if (al.W.length > 1) colours.push(["W", "All white"]);
    const colourNow = e.first.W === "W" ? "W" : `${e.first.B}|${e.first.D}`;
    const pats: [string, string][] = [];
    if (al.A.includes("a")) pats.push(["a", "Solid"]);
    if (al.A.includes("A")) for (const t of al.T) pats.push([t, SHORT[t][0].toUpperCase() + SHORT[t].slice(1)]);
    pats.push(["?", "Not sure"]);
    const patNow = e.first.A === "a" ? "a" : e.first.A === "?" ? "?" : e.first.T;
    const whiteNow = e.first.S === "s" ? "s" : e.second.S === "S" ? "SS" : "S";
    const hiddenLoci = LOCI.filter((l) => l !== "S" && al[l].length > 1).filter((l) => {
      const f = e.first[l];
      return f !== "?" && al[l].some((x) => ALLELES[l].indexOf(x) > ALLELES[l].indexOf(f));
    });
    return (
      <div className="rounded-xl border-[3px] border-[#C8102E] bg-white dark:bg-background p-4 space-y-4 min-w-0 shadow-sm">
        <div className="flex items-center gap-3">
          <CatPic name={ph.name} group={ph.group} size={120} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{who === "dam" ? "Queen" : "Stud"}</h2>
            <p className="text-sm font-medium">{ph.name}</p>
            <p className="text-xs text-muted-foreground">{ph.ems}</p>
          </div>
        </div>

        <Chips label="Colour" items={colours} value={colourNow} onPick={(v) =>
          set(v === "W" ? setF(e, { W: "W" }) : setF(e, { W: "w", B: v.split("|")[0], D: v.split("|")[1] }))} />
        <Chips label="Red" items={RED_OPTS[who]} value={e.red} onPick={(v) => set({ ...e, red: v })} />
        <Chips label="Tabby or solid" items={pats} value={patNow} onPick={(v) =>
          set(v === "a" ? setF(e, { A: "a" }) : v === "?" ? setF(e, { A: "?" }) : setF(e, { A: "A", T: v }))} />
        <Chips label="Silver" items={al.I.length > 1 ? [["i", "Not silver"], ["I", "Silver / smoke"]] : []} value={e.first.I}
          onPick={(v) => set(setF(e, { I: v }))} />
        <Chips label="White" items={al.S.length > 1 ? [["s", "No white"], ["S", "With white"], ["SS", "Van / harlequin"]] : []} value={whiteNow}
          onPick={(v) => set(v === "s" ? setF(e, { S: "s" }) : v === "S" ? setF(e, { S: "S" }, { S: "s" }) : setF(e, { S: "S" }, { S: "S" }))} />
        <Chips label="Colourpoint" items={al.C.length > 1 ? [["C", "Full colour"], ["cs", "Pointed"]] : []} value={e.first.C}
          onPick={(v) => set(setF(e, { C: v }))} />
        {polyBreed && (
          <Chips label="Extra toes (polydactyl)" items={[["0", "No"], ["0.5", "One copy"], ["1", "Two copies"], ["?", "Not sure"]]}
            value={poly[who]} onPick={(v) => setPoly({ ...poly, [who]: v })} />
        )}

        {hiddenLoci.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Hidden genes</div>
            {hiddenLoci.map((l) => {
              const f = e.first[l];
              const lower = al[l].filter((a) => ALLELES[l].indexOf(a) > ALLELES[l].indexOf(f));
              return (
                <select key={l} className="w-full rounded border p-2 bg-background text-sm" value={e.second[l]}
                  onChange={(ev) => set({ ...e, second: { ...e.second, [l]: ev.target.value } })}>
                  {COPIES.includes(l) ? (
                    <>
                      <option value="?">{COPY_NAME[l][0].toUpperCase() + COPY_NAME[l].slice(1)}: not sure how many copies</option>
                      <option value={f}>{COPY_NAME[l][0].toUpperCase() + COPY_NAME[l].slice(1)}: two copies (every kitten gets it)</option>
                      {lower.map((a) => <option key={a} value={a}>{COPY_NAME[l][0].toUpperCase() + COPY_NAME[l].slice(1)}: one copy (about half get it)</option>)}
                    </>
                  ) : (
                    <>
                      <option value="?">Not sure if carries {lower.map((a) => HIDDEN[a]).join(" or ")}</option>
                      <option value={f}>Does not carry {lower.map((a) => HIDDEN[a]).join(" or ")}</option>
                      {lower.map((a) => <option key={a} value={a}>Carries {HIDDEN[a]}</option>)}
                    </>
                  )}
                </select>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6 bg-white dark:bg-background rounded-xl">
      <div>
        <h1 className="text-2xl font-bold">Colour Predictor</h1>
        <p className="text-sm text-muted-foreground">Try any pairing. Nothing is saved.</p>
      </div>

      <details className="rounded-xl border bg-white dark:bg-background p-4 text-sm">
        <summary className="cursor-pointer font-bold">How to use this</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Pick the breed. Both parents must be the same breed.</li>
          <li>For the queen and the stud, set what you can see: red or not, dilute or not, tabby or solid, pattern, silver and white.</li>
          <li>Under each one, say whether the cat carries a hidden copy. Not sure? Leave it on <b>Not sure</b>. That's normal.</li>
          <li>Anything unknown appears in the yellow box. Switch between the choices there to see how the litter changes.</li>
          <li>Results are grouped by colour. Tap a colour to see every variation, its chance, and whether it can be a girl (♀) or boy (♂).</li>
        </ol>
        <h3 className="mt-4 font-bold">Words used here</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li><b>Dilute</b>: a gene that softens black to blue and red to cream. <b>Not dilute</b> means the strong colour, black or red.</li>
          <li><b>Carries</b>: the cat has a hidden copy it doesn't show but can pass to kittens. A kitten only shows a hidden gene if it gets a copy from both parents.</li>
          <li><b>Tabby or solid</b>: tabby cats show stripes or swirls; solid cats are one colour all over. Smoke is a solid silver.</li>
          <li><b>Red cats</b> can hide tabby or solid, so choose <b>Can't tell</b> if you're not sure.</li>
          <li><b>Torties and calicos</b> are girls. Red boys get their red from their mother only.</li>
          <li><b>Polydactyl</b> (Maine Coon): extra toes. It only takes one copy, so a polydactyl cat bred to a normal-pawed cat gives about half polydactyl kittens.</li>
          <li>Percentages are the chance for each kitten, not how many you'll get. Real litters are small, so anything can happen.</li>
        </ul>
      </details>

      <label className="block text-sm max-w-sm">
        <span className="font-medium">Breed (both parents)</span>
        <select className="mt-1 w-full rounded border p-2 bg-background" value={breedId}
          onChange={(ev) => changeBreed(ev.target.value)}>
          {BREEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {panel("dam", dam, setDam)}
        {panel("sire", sire, setSire)}
      </div>

      {unknowns.length > 0 && (
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/30 space-y-3">
          <h2 className="font-bold">Unknown genes — results below assume:</h2>
          <p className="text-xs text-muted-foreground">Change these to see each possibility. Carriers are only certain from a DNA test or a litter that reveals them.</p>
          {unknowns.map((u) => (
            <label key={u.key} className="block text-sm">
              <span className="font-medium">{u.who === "dam" ? "Queen" : "Stud"} — {QUESTION[u.locus].toLowerCase()}</span>
              <select className="mt-1 w-full rounded border p-2 bg-background"
                value={assume[u.key] !== undefined && assume[u.key] < u.options.length ? assume[u.key] : u.options.length - 1}
                onChange={(ev) => setAssume({ ...assume, [u.key]: Number(ev.target.value) })}>
                {u.options.map((o, i) => <option key={i} value={i}>{pairLabel(u.locus, o, u.options)}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Possible kittens</h2>
          <button className="text-sm underline" onClick={() => setFlat(!flat)}>
            {flat ? "Group by colour" : "Show full list"}
          </button>
        </div>

        {flat ? (
          <OutcomeList outcomes={result.outcomes} />
        ) : (
          result.groups.map((g) => (
            <div key={g.group} className="rounded-xl border bg-white dark:bg-background shadow-sm">
              <button className="w-full p-3 text-left" onClick={() => setOpen({ ...open, [g.group]: !open[g.group] })}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-3">
                    <CatPic name={g.outcomes[0].name} group={g.group} size={60} />
                    <span className="font-semibold capitalize">{g.group}</span>
                  </span>
                  <span className="font-bold">{pct(g.p)} {open[g.group] ? "▾" : "▸"}</span>
                </div>
                <div className="mt-2 h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-[#C8102E]" style={{ width: `${g.p * 100}%` }} />
                </div>
              </button>
              {open[g.group] && <div className="border-t p-3"><OutcomeList outcomes={g.outcomes} /></div>}
            </div>
          ))
        )}
        {polyBreed && (poly.dam !== "0" || poly.sire !== "0") && (() => {
          const [lo, hi] = polyRange(poly.dam, poly.sire);
          return (
            <div className="rounded-xl border bg-white dark:bg-background p-3 text-sm">
              <span className="font-semibold">Extra toes (polydactyl): </span>
              {lo === hi ? pct(lo) : `${pct(lo)} to ${pct(hi)}`} of kittens, boys and girls alike.
              <p className="mt-1 text-xs text-muted-foreground">
                One copy is enough to give extra toes, but how many varies from kitten to kitten, and now and then a kitten carrying it shows none.
              </p>
            </div>
          );
        })()}
        <p className="text-xs text-muted-foreground">
          Percentages are the chance for each kitten, not a count per litter. ♀ and ♂ show the chance of a female or male kitten in that colour.
          Amount of white and shading vary from kitten to kitten.
        </p>
      </div>
    </div>
  );
}

function OutcomeList({ outcomes }: { outcomes: { name: string; ems: string; group: string; p: number; pF: number; pM: number }[] }) {
  return (
    <ul className="space-y-2">
      {outcomes.map((o) => (
        <li key={o.name} className="flex items-center gap-3 text-sm">
          <CatPic name={o.name} group={o.group} size={52} />
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
            <span className="min-w-0">
              <span className="font-medium">{o.name}</span>{" "}
              <span className="text-xs text-muted-foreground whitespace-nowrap">{o.ems}</span>
            </span>
            <span className="whitespace-nowrap">
              <b>{pct(o.p)}</b> <span className="text-muted-foreground">♀ {pct(o.pF)} · ♂ {pct(o.pM)}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Original drawn cat, coloured from a kitten's predicted colour name.
const BASE: Record<string, string> = {
  black: "#1f1d1c", blue: "#7d8898", chocolate: "#5a3825", lilac: "#b7a5a3",
  cinnamon: "#8f4d2c", fawn: "#cdb09b", red: "#d6732a", cream: "#eecd9c", seal: "#3b2a21",
};
const LIGHT: Record<string, string> = {
  black: "#9a8670", blue: "#c2c9d2", chocolate: "#bf9f80", lilac: "#e5dbd7",
  cinnamon: "#d7a988", fawn: "#efe1d2", red: "#f3bb7e", cream: "#fbeccf", seal: "#ddcdb6",
};
const TORT: Record<string, string> = {
  black: "red", blue: "cream", chocolate: "red", lilac: "cream", cinnamon: "red", fawn: "cream", seal: "red",
};
const WHITE = "#fbfaf7";

// Outline pieces (viewBox 0 0 120 120)
const TAIL = "M84 106 C104 105 112 88 104 72 C101 66 94 68 96 74 C102 86 96 97 80 99 Z";
const BODY = "M36 110 C28 94 30 74 44 63 L76 63 C90 74 92 94 84 110 Z";
const HEAD = "M33 45 C33 29 45 22 60 22 C75 22 87 29 87 45 C87 60 75 68 60 68 C45 68 33 60 33 45 Z";
const EAR_L = "M37 36 L34 9 L55 25 Z";
const EAR_R = "M83 36 L86 9 L65 25 Z";
const LEGS = "M49 80 H58 V108 H49 Z M62 80 H71 V108 H62 Z";

function CatPic({ name, group, size = 88 }: { name: string; group: string; size?: number }) {
  const n = name.toLowerCase();
  const allWhite = n.startsWith("white");
  const tortie = /tortie|torbie|calico/.test(n);
  const point = n.includes("point");
  const silver = n.includes("silver");
  const smoke = n.includes("smoke");
  const tabby = /tabby|torbie/.test(n);
  const pattern = n.includes("classic") ? "classic" : n.includes("ticked") ? "ticked" : "mackerel";
  const white = n.includes("high white") ? "high" : n.includes("with white") ? "some" : "none";
  let c = group.replace(" tortie", "");
  if (point && c === "black") c = "seal";
  const main = allWhite ? WHITE : BASE[c] ?? BASE.black;
  const ground = allWhite ? WHITE : point ? "#f4ede1" : silver ? "#e2e5e9" : tabby ? LIGHT[c] ?? main : main;
  const stripe = tabby && !allWhite ? main : undefined;
  const patch = tortie ? BASE[TORT[c] ?? "red"] : undefined;
  const eye = point || allWhite ? "#6aa9e6" : c === "red" || c === "cream" ? "#d9a441" : "#9cc04a";
  const id = Math.random().toString(36).slice(2, 8);
  const ink = "#2a2522";

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={name}>
      <defs>
        <clipPath id={`c${id}`}>
          <path d={TAIL} /><path d={BODY} /><path d={HEAD} /><path d={EAR_L} /><path d={EAR_R} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" stopColor={main} /><stop offset="1" stopColor="#dfe3e8" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#c${id})`}>
        <rect width="120" height="120" fill={smoke ? `url(#g${id})` : ground} />

        {/* haunches give the body shape */}
        <ellipse cx="40" cy="96" rx="11" ry="14" fill="#000" opacity="0.06" />
        <ellipse cx="80" cy="96" rx="11" ry="14" fill="#000" opacity="0.06" />

        {stripe && (
          <g stroke={stripe} strokeLinecap="round" fill="none">
            {/* forehead M and cheek lines on every tabby */}
            <path d="M52 34 L55 27 L60 32 L65 27 L68 34" strokeWidth="2.2" />
            <path d="M36 46 q5 1 9 -1 M36 51 q5 1 9 -1 M84 46 q-5 1 -9 -1 M84 51 q-5 1 -9 -1" strokeWidth="1.8" />
            {/* tail rings */}
            <path d="M100 76 l6 -3 M103 86 l6 -1 M98 96 l5 2" strokeWidth="2.6" />
            {/* leg bars */}
            <path d="M49 88 h9 M49 95 h9 M62 88 h9 M62 95 h9" strokeWidth="2" />
            {pattern === "mackerel" && (
              <g strokeWidth="1.8">
                <path d="M33 76 q2 9 1 20 M38 69 q2 12 1 30 M43 66 q2 12 1 32 M77 66 q-2 12 -1 32 M82 69 q-2 12 -1 30 M87 76 q-2 9 -1 20" />
                <path d="M46 70 q14 6 28 0 M47 75 q13 5 26 0" />
              </g>
            )}
            {pattern === "classic" && (
              <g strokeWidth="4">
                <ellipse cx="39" cy="92" rx="8.5" ry="11.5" /><ellipse cx="81" cy="92" rx="8.5" ry="11.5" />
                <ellipse cx="39" cy="92" rx="2.8" ry="4.2" fill={stripe} /><ellipse cx="81" cy="92" rx="2.8" ry="4.2" fill={stripe} />
                <path d="M40 67 q10 -4 20 3 q10 -7 20 -3" />
              </g>
            )}
          </g>
        )}
        {stripe && pattern === "ticked" && (
          <g fill={stripe} opacity="0.55">
            {Array.from({ length: 40 }, (_, i) => (
              <circle key={i} cx={32 + ((i * 17) % 56)} cy={66 + ((i * 11) % 42)} r="0.9" />
            ))}
          </g>
        )}

        {patch && (
          <g fill={patch}>
            <path d="M33 70 C40 64 48 70 46 80 C44 90 36 90 33 84 Z" />
            <path d="M66 90 C74 84 84 88 82 100 C76 108 66 104 66 90 Z" />
            <path d="M58 22 C70 20 80 26 82 36 C74 38 64 34 58 22 Z" />
            <path d="M96 74 C102 70 108 78 104 86 C100 84 96 80 96 74 Z" />
          </g>
        )}

        {point && (
          <g fill={main}>
            <path d={EAR_L} /><path d={EAR_R} />
            <ellipse cx="60" cy="50" rx="15" ry="13" opacity="0.92" />
            <path d="M49 96 H58 V110 H49 Z M62 96 H71 V110 H62 Z" />
            <path d={TAIL} />
          </g>
        )}

        {white === "some" && (
          <g fill={WHITE}>
            <path d="M50 52 C54 58 66 58 70 52 C72 60 68 66 60 67 C52 66 48 60 50 52 Z" />
            <path d="M46 64 C52 70 68 70 74 64 C74 80 70 96 66 110 H54 C50 96 46 80 46 64 Z" />
            <path d="M47 102 H60 V110 H47 Z M60 102 H73 V110 H60 Z" />
          </g>
        )}
        {white === "high" && (
          <g fill={WHITE}>
            <path d="M20 58 H100 V120 H20 Z" />
            <path d="M44 40 C50 52 70 52 76 40 C80 56 72 68 60 68 C48 68 40 56 44 40 Z" />
            <path d={TAIL} fill="none" />
          </g>
        )}
        {white === "high" && <path d="M96 74 C102 70 108 78 104 86 C100 84 96 80 96 74 Z" fill={main} />}
      </g>

      {/* inner ears */}
      <path d="M39 31 L37 15 L50 25 Z M81 31 L83 15 L70 25 Z" fill="#e8a5a0" opacity="0.8" />

      {/* outlines */}
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinejoin="round">
        <path d={TAIL} /><path d={BODY} /><path d={EAR_L} /><path d={EAR_R} /><path d={HEAD} />
        <path d="M53.5 80 V108 M66.5 80 V108" strokeWidth="1.1" />
        <path d="M46 108 q3.5 -3 7 0 M60 108 q3.5 -3 7 0 M53 108 q3.5 -3 7 0" strokeWidth="1.1" />
      </g>

      {/* face */}
      <g>
        <ellipse cx="50" cy="43" rx="5.2" ry="3.8" fill={eye} stroke={ink} strokeWidth="1" />
        <ellipse cx="70" cy="43" rx="5.2" ry="3.8" fill={eye} stroke={ink} strokeWidth="1" />
        <ellipse cx="50" cy="43" rx="1.2" ry="3.2" fill={ink} />
        <ellipse cx="70" cy="43" rx="1.2" ry="3.2" fill={ink} />
        <circle cx="51.3" cy="41.8" r="0.8" fill="#fff" /><circle cx="71.3" cy="41.8" r="0.8" fill="#fff" />
        <path d="M57 51 H63 L60 54.5 Z" fill="#d98a8a" stroke={ink} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M60 54.5 V57 M60 57 q-3 2.5 -5.5 0.5 M60 57 q3 2.5 5.5 0.5" fill="none" stroke={ink} strokeWidth="1" strokeLinecap="round" />
        <path d="M52 54 L36 52 M52 56 L37 58 M68 54 L84 52 M68 56 L83 58" stroke={ink} strokeWidth="0.6" opacity="0.6" />
      </g>
    </svg>
  );
}

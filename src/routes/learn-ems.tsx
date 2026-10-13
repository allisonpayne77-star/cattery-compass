import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

// Public page: teach-then-test game for Maine Coon EMS colour codes.
export const Route = createFileRoute("/learn-ems")({ component: EmsGame });

type Cfg = { colour: string; red: string; tabby: boolean; pattern: string; silver: boolean; white: string; point?: boolean };
const C = (colour: string, red = "none", extra: Partial<Cfg> = {}): Cfg =>
  ({ colour, red, tabby: false, pattern: "mackerel", silver: false, white: "none", ...extra });

// ---------- breeds ----------
type Breed = { id: string; name: string; prefix: string; choc: boolean; cin?: boolean; points: "none" | "optional" | "always"; silver: boolean; white: boolean; mitted?: boolean };
const BREEDS: Breed[] = [
  { id: "mco", name: "Maine Coon", prefix: "MCO", choc: false, points: "none", silver: true, white: true },
  { id: "nfo", name: "Norwegian Forest Cat", prefix: "NFO", choc: false, points: "none", silver: true, white: true },
  { id: "sib", name: "Siberian", prefix: "SIB", choc: false, points: "optional", silver: true, white: true },
  { id: "bsh", cin: true, name: "British Shorthair / Longhair", prefix: "BSH", choc: true, points: "optional", silver: true, white: true },
  { id: "per", cin: true, name: "Persian / Exotic", prefix: "PER", choc: true, points: "optional", silver: true, white: true },
  { id: "rag", name: "Ragdoll", prefix: "RAG", choc: true, points: "always", silver: false, white: true, mitted: true },
  { id: "sia", cin: true, name: "Siamese / Birman", prefix: "SIA", choc: true, points: "always", silver: false, white: false },
  { id: "all", cin: true, name: "Mixed: all breeds", prefix: "", choc: true, points: "optional", silver: true, white: true },
];

// ---------- naming ----------
const EU: Record<string, [string, string]> = {
  black: ["black", "n"], blue: ["blue", "a"], chocolate: ["chocolate", "b"], lilac: ["lilac", "c"], cinnamon: ["cinnamon", "o"], fawn: ["fawn", "p"],
};
const TE: Record<string, string> = { black: "f", blue: "g", chocolate: "h", lilac: "j", cinnamon: "q", fawn: "r" };
const DILUTE = ["blue", "lilac", "fawn"];
const PAT: Record<string, [string, string]> = { mackerel: ["mackerel", "23"], classic: ["classic", "22"], ticked: ["ticked", "25"] };
let BR: Breed = BREEDS[0];

function describe(o: Cfg): { name: string; code: string; group: string } {
  const dil = DILUTE.includes(o.colour);
  let word: string, code: string, group: string;
  if (o.red === "red") { word = dil ? "cream" : "red"; code = dil ? "e" : "d"; group = word; }
  else {
    word = EU[o.colour][0]; code = o.red === "tortie" ? TE[o.colour] : EU[o.colour][1];
    group = o.red === "tortie" ? `${word} tortie` : word;
    if (o.point && word === "black") word = "seal";
  }
  const p = [word];
  if (o.silver) p.push(o.tabby ? "silver" : "smoke");
  if (o.tabby) p.push(o.point ? "tabby" : PAT[o.pattern][0], ...(o.point ? [] : [o.red === "tortie" ? "torbie" : "tabby"]));
  if (o.red === "tortie") p.push(o.tabby && !o.point ? "" : "tortie");
  if (o.point) p.push("point");
  let name = p.filter(Boolean).join(" ");
  if (o.white === "some") name += BR.mitted ? " mitted" : o.red === "tortie" ? " with white (calico)" : " with white";
  if (o.white === "high") name += BR.mitted ? " bicolour" : " (van)";
  let e = code + (o.silver ? "s" : "");
  if (o.white === "some") e += BR.mitted ? " 04" : " 09";
  if (o.white === "high") e += BR.mitted ? " 03" : " 01";
  if (o.tabby) e += " " + (o.point ? "21" : PAT[o.pattern][1]);
  if (o.point) e += " 33";
  return { name, code: e, group };
}
// fit a cat to the chosen breed: pointed breeds are always pointed
const fit = (o: Cfg): Cfg => (BR.points === "always" ? { ...o, point: true } : o);
const fits = (b: Breed, o: Cfg) =>
  (b.choc || !["chocolate", "lilac", "cinnamon", "fawn"].includes(o.colour)) && (b.cin || !["cinnamon", "fawn"].includes(o.colour)) &&
  (b.silver || !o.silver) && (b.white || o.white === "none") && (b.points !== "none" || !o.point) &&
  (b.points !== "always" || !!o.point || true) && (b.points !== "optional" || true);
const allowed = (o: Cfg) => fits(BR, o);
// in the mixed game, each cat gets a real breed code it could belong to (always the same one for the same cat)
function prefixFor(o: Cfg): string {
  if (BR.prefix) return BR.prefix;
  const ok = BREEDS.filter((b) => b.prefix && fits(b, o) && (b.points === "always" ? !!o.point : b.points === "none" ? !o.point : true) && !b.mitted);
  const key = JSON.stringify(o); let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ok.length ? ok[h % ok.length].prefix : "";
}
const Pic = ({ o, size }: { o: Cfg; size: number }) => { const d = describe(fit(o)); return <CatPic name={d.name} group={d.group} size={size} />; };

// ---------- levels ----------
type Level = { id: string; name: string; title: string; body: () => string[]; key: () => [Cfg, string?][]; pool: Cfg[]; isNew: (o: Cfg) => boolean;
  text?: () => [string, string, string[]][]; show: () => boolean; full?: boolean; textOnly?: boolean };
const BREED_CODES: [string, string][] = [
  ["MCO", "Maine Coon"], ["NFO", "Norwegian Forest Cat"], ["SIB", "Siberian"], ["BSH", "British Shorthair"], ["BLH", "British Longhair"],
  ["PER", "Persian"], ["EXO", "Exotic"], ["RAG", "Ragdoll"], ["SIA", "Siamese"], ["SBI", "Birman"], ["SPH", "Sphynx"], ["ABY", "Abyssinian"],
];
function breedQuestions(): [string, string, string[]][] {
  return shuffle(BREED_CODES).slice(0, 4).map(([c, n], i) => {
    const wrong = shuffle(BREED_CODES.filter((x) => x[0] !== c)).slice(0, 3);
    return i % 2 === 0 ? [`Which breed is ${c}?`, n, wrong.map((x) => x[1])] : [`What is the code for ${n}?`, c, wrong.map((x) => x[0])];
  });
}
const pointNote = () => (BR.points === "always" ? " Every code for this breed ends in 33, because every cat is pointed, and black is called seal." : "");
const LEVELS: Level[] = [
  { id: "col", name: "Colours", title: "The first letter is the colour", show: () => true, isNew: () => true,
    body: () => ["In EMS the colour comes first, as a single letter: n black, a blue, d red, e cream." + pointNote(), "Blue is dilute black and cream is dilute red: the same colour, softened.", "n covers every black cat, and not all of them look black. A brown tabby is an n cat: the tabby gene lets warm brown through the background hairs, and only the stripes stay truly black. So n 22 is a brown classic tabby. True brown is chocolate, code b" + (BR.choc ? "." : ", which your breed does not have.")],
    key: () => [[C("black")], [C("blue")], [C("black", "red")], [C("blue", "red")]],
    pool: [C("black"), C("blue"), C("black", "red"), C("blue", "red")] },
  { id: "more", name: "More colours", title: "Chocolate, lilac, cinnamon and fawn", show: () => BR.choc, isNew: (o) => ["chocolate", "lilac", "cinnamon", "fawn"].includes(o.colour),
    body: () => ["Some breeds carry more versions of black. Chocolate is b and its dilute, lilac, is c." + (BR.cin ? "" : " Your breed has chocolate and lilac but not cinnamon."),
      BR.cin ? "Cinnamon is o and its dilute, fawn, is p. Maine Coons and Norwegians don't have any of these colours." : "Maine Coons and Norwegians don't have these colours at all."],
    key: () => [[C("chocolate")], [C("lilac")], [C("cinnamon")], [C("fawn")]],
    pool: [C("chocolate"), C("lilac"), C("cinnamon"), C("fawn"), C("black"), C("blue")] },
  { id: "tor", name: "Torties", title: "Torties get their own letter", show: () => true, isNew: (o) => o.red === "tortie",
    body: () => ["A tortie has black and red patches together. Instead of two letters, EMS gives her one: f. A blue tortie is g." + (BR.choc ? " Chocolate tortie is h and lilac tortie is j." : ""), "Torties are almost always girls, because red is carried on the X chromosome."],
    key: () => [[C("black", "tortie")], [C("blue", "tortie")], ...(BR.choc ? [[C("chocolate", "tortie")] as [Cfg]] : [])],
    pool: [C("black", "tortie"), C("blue", "tortie"), C("chocolate", "tortie"), C("lilac", "tortie"), C("black"), C("blue"), C("black", "red"), C("blue", "red")] },
  { id: "sil", name: "Silver", title: "s means silver", show: () => BR.silver, isNew: (o) => o.silver,
    body: () => ["Add an s straight after the colour letter when the cat has the silver gene. There's no space: ns, as, ds, fs.", "On a tabby it shows as a silver tabby. On a solid cat it shows as a smoke: dark tips over a pale undercoat."],
    key: () => [[C("black", "none", { silver: true })], [C("blue", "none", { silver: true })], [C("black", "tortie", { silver: true })]],
    pool: [C("black", "none", { silver: true }), C("blue", "none", { silver: true }), C("black", "tortie", { silver: true }), C("black"), C("blue"), C("black", "tortie"), C("black", "red", { silver: true })] },
  { id: "pat", name: "Patterns", title: "Two numbers for the tabby pattern", show: () => true, isNew: (o) => o.tabby,
    body: () => BR.points === "always"
      ? ["Tabby markings get a two-digit number after the colour. On pointed cats the stripes only show on the points, so the code is 21 (tabby, also called lynx point)."]
      : ["Tabby patterns go at the end as a two-digit number.", "22 is classic (the bullseye swirl on the side). 23 is mackerel (narrow stripes, like a fish skeleton). 24 is spotted and 25 is ticked."],
    key: () => BR.points === "always"
      ? [[C("black", "none", { tabby: true })], [C("blue", "none", { tabby: true })]]
      : [[C("black", "red", { tabby: true, pattern: "classic" })], [C("black", "none", { silver: true, tabby: true, pattern: "mackerel" })]],
    pool: [C("black", "none", { tabby: true, pattern: "classic" }), C("black", "none", { tabby: true, pattern: "mackerel" }), C("blue", "none", { tabby: true, pattern: "classic" }), C("blue", "none", { tabby: true, pattern: "mackerel" }), C("black", "red", { tabby: true, pattern: "classic" }), C("black", "red", { tabby: true, pattern: "mackerel" })] },
  { id: "wht", name: "White", title: "White comes before the pattern", show: () => BR.white, isNew: (o) => o.white !== "none",
    body: () => BR.mitted
      ? ["White markings get a two-digit number, placed after the colour and before the pattern.", "In Ragdolls, 04 is mitted (white paws and chin) and 03 is bicolour (an upside-down white V on the face and a white belly)."]
      : ["White markings get a two-digit number, placed after the colour and before the pattern.", "09 is some white (paws, chest, belly). 03 is bicolour, about a third to a half white. 02 is harlequin and 01 is van, mostly white with colour on the head and tail."],
    key: () => [[C("black", "none", { white: "some" })], [C("black", "red", { white: "high" })]],
    pool: [C("black", "none", { white: "some" }), C("black", "red", { white: "high" }), C("black"), C("black", "tortie", { white: "some" }), C("blue", "none", { white: "some" }), C("blue", "red", { white: "high" })],
    text: () => BR.mitted
      ? [["In Ragdolls, what does 04 mean?", "mitted", ["bicolour", "van", "silver"]], ["In Ragdolls, what does 03 mean?", "bicolour", ["mitted", "harlequin", "smoke"]]]
      : [["What does 09 mean?", "some white (paws, chest)", ["bicolour", "van", "silver"]], ["What does 03 mean?", "bicolour", ["some white", "harlequin", "smoke"]], ["What does 01 mean?", "van", ["bicolour", "some white", "classic tabby"]]] },
  { id: "pts", name: "Colourpoints", title: "33 means colourpoint", show: () => BR.points === "optional", isNew: (o) => !!o.point,
    body: () => ["Colourpoint cats have a pale body with darker ears, face, legs and tail, and blue eyes. EMS adds 33 at the end of the code.", "A black colourpoint is called seal point: n 33. A blue point is a 33."],
    key: () => [[C("black", "none", { point: true })], [C("blue", "none", { point: true })], [C("black", "red", { point: true })]],
    pool: [C("black", "none", { point: true }), C("blue", "none", { point: true }), C("black", "red", { point: true }), C("blue", "red", { point: true }), C("black"), C("blue"), C("black", "tortie", { point: true })] },
  { id: "brd", name: "Breed codes", title: "Three letters for the breed", show: () => true, isNew: () => true, textOnly: true,
    body: () => ["Every full EMS code starts with the breed, written as three capital letters." + (BR.prefix ? ` Your breed is ${BR.prefix}.` : ""),
      "MCO Maine Coon, NFO Norwegian Forest Cat, SIB Siberian, BSH British Shorthair, BLH British Longhair, PER Persian, EXO Exotic, RAG Ragdoll, SIA Siamese, SBI Birman, SPH Sphynx, ABY Abyssinian."],
    key: () => [], pool: [], text: breedQuestions },
  { id: "full", name: "Full codes", title: "Put it all together", show: () => true, isNew: () => true, full: true,
    body: () => ["A full EMS code reads in order: breed, colour letter (with s for silver), white number, pattern number, then 33 for points.",
      BR.prefix ? `So ${BR.prefix} ${describe(fit(C("black", "red", { white: "some", tabby: true, pattern: "mackerel" }))).code} is a ${BR.name.split(" /")[0]}, ${describe(fit(C("black", "red", { white: "some", tabby: true, pattern: "mackerel" }))).name}.` : "The breed comes first as three letters: MCO Maine Coon, BSH British Shorthair, RAG Ragdoll, SIA Siamese."],
    key: () => [[C("black", "none", { silver: true, tabby: true, pattern: "classic" })], [C("black", "red", { white: "some", tabby: true, pattern: "mackerel" })]],
    pool: [C("black", "none", { silver: true, tabby: true, pattern: "classic" }), C("black", "none", { silver: true, tabby: true, pattern: "mackerel" }), C("black", "red", { white: "some", tabby: true, pattern: "mackerel" }), C("blue", "none", { silver: true }), C("black", "tortie", { white: "some" }), C("blue", "red", { tabby: true, pattern: "classic" }), C("black", "tortie", { silver: true, tabby: true, pattern: "mackerel" }), C("black", "none", { tabby: true, pattern: "classic", white: "some" }), C("chocolate", "none", { tabby: true, pattern: "classic" }), C("lilac", "tortie", { white: "some" }), C("blue", "none", { point: true, tabby: true })] },
];
const PER_LEVEL = 4;
const PART: Record<string, string> = {
  MCO: "Maine Coon", NFO: "Norwegian Forest Cat", SIB: "Siberian", BSH: "British Shorthair", PER: "Persian", RAG: "Ragdoll", SIA: "Siamese",
  n: "black (seal on a point)", a: "blue (dilute black)", b: "chocolate", c: "lilac (dilute chocolate)", o: "cinnamon", p: "fawn (dilute cinnamon)",
  d: "red", e: "cream (dilute red)", f: "black tortie", g: "blue tortie", h: "chocolate tortie", j: "lilac tortie", q: "cinnamon tortie", r: "fawn tortie",
  "01": "van (mostly white)", "02": "harlequin", "03": "bicolour", "04": "mitted", "09": "some white",
  "21": "tabby (unspecified pattern, lynx on points)", "22": "classic tabby", "23": "mackerel tabby", "24": "spotted tabby", "25": "ticked tabby", "33": "colourpoint",
};
const MODES: Record<string, [string, string]> = {
  learn: ["Learning", "A code key is shown at the top. Hide it when you feel ready."],
  practised: ["Practised", "Key hidden. Tap to peek if you need to."],
  expert: ["Expert", "No key to peek at, and six choices every time."],
};
type Q = { kind: "catToCode" | "codeToCat" | "text"; target?: Cfg; opts: (Cfg | string)[]; ask?: string; answer?: string; again?: boolean };

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const codeOf = (L: Level, o: Cfg) => { const p = L.full ? prefixFor(o) : ""; return (p ? p + " " : "") + describe(fit(o)).code; };
const activeLevels = () => LEVELS.filter((l) => l.show());
// the answer key shows every cat this level can ask about, so in Learning mode every answer is on screen
function keyCats(L: Level): Cfg[] {
  const out: Cfg[] = []; const seen = new Set<string>();
  for (const o of L.pool.filter(allowed).filter(L.isNew)) { const c = codeOf(L, o); if (!seen.has(c)) { seen.add(c); out.push(o); } }
  return out;
}

function makeQuestions(li: number, mode: string): Q[] {
  const levels = activeLevels();
  const L = levels[li];
  const uniq: Cfg[] = []; const seen = new Set<string>();
  for (const o of L.pool.filter(allowed)) { const c = codeOf(L, o); if (!seen.has(c)) { seen.add(c); uniq.push(o); } }
  const n = mode === "expert" ? 6 : mode === "practised" && li >= 3 ? 5 : 4; // Learning always 4
  const texts = L.text ? L.text() : undefined;
  const qs: Q[] = [];
  for (let i = 0; i < PER_LEVEL; i++) {
    if (texts && (L.textOnly || i % 2 === 1)) { const t = texts[(L.textOnly ? i : i >> 1) % texts.length]; qs.push({ kind: "text", ask: t[0], answer: t[1], opts: shuffle([t[1], ...t[2]]) }); continue; }
    // the cat being asked about always shows what this level teaches; other colours only appear as wrong answers
    const fresh = uniq.filter(L.isNew);
    const target = (fresh.length ? fresh : uniq)[Math.floor(Math.random() * (fresh.length || uniq.length))];
    const upto = mode === "expert" ? levels.length - 1 : li;
    const wide: Cfg[] = []; const s2 = new Set([codeOf(L, target)]);
    for (const LL of levels.slice(0, upto + 1)) for (const o of LL.pool.filter(allowed)) { const c = codeOf(L, o); if (!s2.has(c)) { s2.add(c); wide.push(o); } }
    const near = shuffle(uniq.filter((o) => codeOf(L, o) !== codeOf(L, target)));
    const others = [...near, ...shuffle(wide.filter((o) => !near.includes(o)))].slice(0, n - 1);
    qs.push({ kind: i % 2 === 0 ? "catToCode" : "codeToCat", target, opts: shuffle([target, ...others]) });
  }
  return qs;
}

// letter -> a plain cat of that colour, for the picture key
const LETTER_CAT: Record<string, Cfg> = {
  n: C("black"), a: C("blue"), b: C("chocolate"), c: C("lilac"), o: C("cinnamon"), p: C("fawn"),
  d: C("black", "red"), e: C("blue", "red"), f: C("black", "tortie"), g: C("blue", "tortie"), h: C("chocolate", "tortie"), j: C("lilac", "tortie"),
};
// the key lists the building blocks learned so far, not whole answers, so players work each code out
function CodeKey({ li }: { li: number }) {
  const levels = activeLevels().slice(0, li + 1);
  const parts = new Map<string, string>();
  for (const L of levels) {
    for (const o of keyCats(L)) for (const part of codeOf(L, o).split(" ")) {
      const m = part.match(/^([a-z])(s?)$/);
      if (m) { parts.set(m[1], PART[m[1]]); if (m[2]) parts.set("s", "silver / smoke"); }
      else if (PART[part]) parts.set(part, PART[part]);
    }
    if (L.id === "brd") for (const [c, n] of BREED_CODES) parts.set(c, n);
  }
  const groups: [string, (k: string) => boolean][] = [
    ["Colour letters", (k) => /^[a-z]$/.test(k) && k !== "s"], ["Silver", (k) => k === "s"],
    ["White numbers", (k) => /^0\d$/.test(k)], ["Pattern numbers", (k) => /^2\d$/.test(k)], ["Colourpoint", (k) => k === "33"], ["Breed codes", (k) => /^[A-Z]{3}$/.test(k)],
  ];
  return (
    <div className="mt-3 space-y-2">
      {groups.map(([title, test]) => {
        const items = [...parts.entries()].filter(([k]) => test(k));
        if (!items.length) return null;
        return (
          <div key={title}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {items.map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 rounded-lg border bg-white py-0.5 pl-1 pr-2.5 text-sm">
                  {LETTER_CAT[k] && <Pic o={LETTER_CAT[k]} size={36} />}
                  <b className="font-mono text-base text-[#C8102E]">{k}</b>{v}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Breakdown({ code }: { code: string }) {
  const bits: [string, string][] = [];
  for (const part of code.split(" ")) {
    if (PART[part]) { bits.push([part, PART[part]]); continue; }
    const m = part.match(/^([a-z])(s?)$/);
    if (m) { bits.push([m[1], PART[m[1]] || m[1]]); if (m[2]) bits.push(["s", "silver (smoke on a solid, silver on a tabby)"]); }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {bits.map(([k, v], i) => (
        <span key={i} className="rounded-md border bg-white px-2 py-0.5 text-xs text-foreground">
          <b className="mr-1 font-mono text-[#C8102E]">{k}</b>{v}
        </span>
      ))}
    </div>
  );
}

function EmsGame() {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState("learn");
  const [level, setLevel] = useState(0);
  const [qn, setQn] = useState(0);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [levelRight, setLevelRight] = useState(0);
  const [lessonOpen, setLessonOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [breedId, setBreedId] = useState("mco");
  const [saved, setSaved] = useState<{ level: number; breedId: string; mode: string } | null>(null);
  const { user } = useAuth();
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("ems-progress") || "null");
      if (s && typeof s.level === "number" && s.level > 0) { setSaved(s); setBreedId(s.breedId || "mco"); setMode(s.mode || "learn"); }
    } catch { /* storage blocked or empty */ }
  }, []);
  BR = BREEDS.find((x) => x.id === breedId)!;
  const LV = activeLevels();

  const L = LV[Math.min(level, LV.length - 1)];
  const q = questions[qn];
  const isRight = (i: number) => q && (q.kind === "text" ? q.opts[i] === q.answer : codeOf(L, q.opts[i] as Cfg) === codeOf(L, q.target!));

  const startAt = (l: number) => {
    const s = Math.max(0, Math.min(l, LV.length - 1));
    setStarted(true); setLevel(s); setQn(0); setScore(0); setTotal(0); setLevelRight(0); setPicked(null);
    setLessonOpen(mode === "learn"); setQuestions(makeQuestions(s, mode));
  };
  const start = () => startAt(0);
  useEffect(() => {
    if (!started) return;
    try { localStorage.setItem("ems-progress", JSON.stringify({ level, breedId, mode })); } catch { /* storage blocked */ }
  }, [started, level, breedId, mode]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i); setTotal((t) => t + 1);
    if (isRight(i)) { setScore((s) => s + 1); if (!q.again) setLevelRight((r) => r + 1); }
    else if (questions.filter((x) => x.again).length < 6) setQuestions((qs) => [...qs, { ...q, again: true, opts: shuffle(q.opts) }]);
  };

  const next = () => {
    const last = qn === questions.length - 1;
    setPicked(null); setToast("");
    if (last) {
      const perfect = levelRight === PER_LEVEL;
      const nl = level + 1;
      if (perfect && lessonOpen && mode === "learn") setToast("All four right. Try the next level with the key hidden.");
      if (mode === "practised") setLessonOpen(false);
      setLevel(nl); setQn(0); setLevelRight(0);
      if (nl < LV.length) setQuestions(makeQuestions(nl, mode));
    } else setQn(qn + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chip = "rounded-full border px-3 py-1 text-xs";
  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">Learn the EMS colour codes</h1>
            <p className="text-muted-foreground">Pick your breed, then work up through the levels. Each one is harder than the last.</p>
          </div>
          {started && <div className="font-bold tabular-nums">Score {score} / {total}</div>}
        </div>

        {started && (
          <div className="flex flex-wrap gap-1.5">
            {LV.map((x, i) => (
              <span key={x.name} className={`${chip} ${i === level ? "border-[#C8102E] bg-[#C8102E] text-white" : i < level ? "border-green-700 text-green-700" : "bg-muted text-muted-foreground"}`}>{i + 1}. {x.name}</span>
            ))}
          </div>
        )}

        {!started && (
          <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <h2 className="text-xl font-bold">Before you play</h2>
            <p>This game is for <b>practice</b>. It's best after you've taken <b>Course 204 in Cat College</b>, which explains every EMS code properly and how each colour is inherited.</p>
            <p>You can still play without it: every level starts with a short lesson, and each answer comes with an explanation of what every part of the code means. Miss a question and it comes back at the end of the level, so you learn by repetition.</p>
            <div className="flex justify-center gap-2">
              <Pic o={C("black", "none", { silver: true, tabby: true, pattern: "classic" })} size={90} />
              <Pic o={C("black", "red", { tabby: true, pattern: "mackerel", white: "some" })} size={90} />
              <Pic o={C("blue", "tortie")} size={90} />
            </div>
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Choose your breed, or Mixed for every code</div>
              <div className="flex flex-wrap gap-1.5">
                {BREEDS.map((x) => (
                  <button key={x.id} type="button" onClick={() => setBreedId(x.id)} aria-pressed={breedId === x.id}
                    className={`rounded-full border px-3 py-1 text-sm ${breedId === x.id ? "border-[#C8102E] bg-[#C8102E] text-white" : "bg-white"}`}>{x.name}</button>
                ))}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">You'll only be asked about colours your breed can have: {activeLevels().length} levels.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(MODES).map(([k, [t, d]]) => (
                <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k}
                  className={`rounded-xl border-2 bg-white p-3 text-left ${mode === k ? "border-[#C8102E]" : "border-transparent"}`}>
                  <b>{t}</b><div className="text-sm text-muted-foreground">{d}</div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {saved && (
                <button type="button" onClick={() => startAt(saved.level)} className="rounded-full border-2 border-[#C8102E] px-6 py-3 font-bold text-[#C8102E]">
                  Continue from level {saved.level + 1}
                </button>
              )}
              <button type="button" onClick={start} className="rounded-full bg-[#C8102E] px-6 py-3 font-bold text-white">{saved ? "Start again" : "Start the game"}</button>
            </div>
          </section>
        )}

        {started && level >= LV.length && (
          <section className="grid justify-items-center gap-3 rounded-2xl border bg-white p-6 text-center shadow-sm">
            <Pic o={C("black", "red", { tabby: true, pattern: "classic", white: "some" })} size={140} />
            <div className="text-5xl font-extrabold">{score} / {total}</div>
            <p>{total && score / total >= 0.8 ? `Great work. You can read ${BR.id === "all" ? "an" : "a " + BR.name.split(" /")[0]} EMS code.` : "Good start. Go round again and it'll stick."}</p>
            <div className="max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <b>Two of the courses are free.</b><br />Foundations of Cat Breeding and Common Breeder Health Issues cost nothing. Make a free account and start either one. Course 204 goes further into colour and EMS codes when you are ready for it.
              <div className="mt-3"><a href="/academy" className="inline-block rounded-full bg-[#C8102E] px-5 py-2 font-bold text-white">See the free courses</a></div>
            </div>
            <button type="button" onClick={() => setStarted(false)} className="rounded-full border px-5 py-2 font-semibold">Play again</button>
          </section>
        )}

        {started && level < LV.length && q && (
          <>
            {toast && <div className="rounded-lg bg-green-50 p-3 text-green-800">{toast}</div>}
            {!user && (
              <div className="rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
                Playing as a guest. Your place is kept on this device only &mdash; <a href="/auth" className="font-semibold text-[#C8102E] underline">make a free account</a> to keep it anywhere.
              </div>
            )}
            {!user && qn === 0 && level > 0 && (
              <section className="rounded-2xl border-2 border-[#C8102E] bg-white p-5">
                <b className="text-lg">Two of the courses are free.</b>
                <p className="mt-1.5">Foundations of Cat Breeding and Common Breeder Health Issues cost nothing. Make a free account and start either one &mdash; your place in this game gets saved to it as well.</p>
                <div className="mt-3"><a href="/auth" className="inline-block rounded-full bg-[#C8102E] px-5 py-2 font-bold text-white">Make a free account</a></div>
              </section>
            )}
            {mode !== "expert" && (lessonOpen ? (
              <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
                <button type="button" onClick={() => setLessonOpen(false)} className="float-right ml-2 rounded-full bg-[#C8102E] px-3 py-1 text-xs font-bold text-white">Hide the key</button>
                <h2 className="text-xl font-bold">{L.title}</h2>
                {L.body().map((p) => <p key={p} className="mt-1.5">{p}</p>)}
                <CodeKey li={level} />
              </section>
            ) : (
              <section className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3">
                <button type="button" onClick={() => setLessonOpen(true)} className="font-semibold text-[#C8102E]">Show the key again</button>
              </section>
            ))}

            <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-lg font-bold">
                {q.again ? "Again: " : ""}Question {qn + 1} of {questions.length}: {q.kind === "catToCode" ? "What is this cat's EMS code?" : q.kind === "codeToCat" ? "Which cat has this code?" : q.ask}
              </div>
              {q.kind === "catToCode" && (
                <div className="grid justify-items-center gap-1">
                  <Pic o={q.target!} size={150} />
                  {picked !== null && <div className="font-semibold">{describe(fit(q.target!)).name}</div>}
                </div>
              )}
              {q.kind === "codeToCat" && <div className="text-center font-mono text-4xl font-bold text-[#C8102E]">{codeOf(L, q.target!)}</div>}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {q.opts.map((o, i) => {
                  const state = picked === null ? "" : isRight(i) ? "border-green-600 bg-green-50" : picked === i ? "border-red-600 bg-red-50" : "";
                  return (
                    <button key={i} type="button" disabled={picked !== null} onClick={() => pick(i)}
                      className={`grid justify-items-center rounded-xl border-2 bg-white p-3 hover:border-[#C8102E] ${state}`}>
                      {q.kind === "catToCode" ? <span className="font-mono text-xl font-bold">{codeOf(L, o as Cfg)}</span>
                        : q.kind === "codeToCat" ? <Pic o={o as Cfg} size={90} /> : <span>{o as string}</span>}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <>
                  <div className={`rounded-lg p-3 ${isRight(picked) ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {isRight(picked) ? "Correct. " : "Not quite. This one will come back at the end of the level. "}
                    <span className="text-foreground">
                      {q.kind === "text" ? <>The answer is <b>{q.answer}</b>.</> : <><b>{codeOf(L, q.target!)}</b> is {describe(fit(q.target!)).name}.<Breakdown code={codeOf(L, q.target!)} /></>}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={next} autoFocus className="rounded-full bg-[#C8102E] px-6 py-3 font-bold text-white">
                      {qn === questions.length - 1 ? (level === LV.length - 1 ? "See your score" : "Next level") : "Next question"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
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
  const white = n.includes("(van)") ? "van" : n.includes("bicolour") ? "high" : n.includes("mitted") ? "mitted" : n.includes("with white") ? "some" : "none";
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
                {/* fine, evenly spaced pinstripes down the body, like a fish skeleton */}
                <path d="M33 76 q2 9 1 20 M38 69 q2 12 1 30 M43 66 q2 12 1 32 M77 66 q-2 12 -1 32 M82 69 q-2 12 -1 30 M87 76 q-2 9 -1 20" />
                {/* necklace rings across the chest */}
                <path d="M46 70 q14 6 28 0 M47 75 q13 5 26 0" />
              </g>
            )}
            {pattern === "classic" && (
              <g strokeWidth="4">
                {/* big bold bullseye swirls on each side */}
                <ellipse cx="39" cy="92" rx="8.5" ry="11.5" /><ellipse cx="81" cy="92" rx="8.5" ry="11.5" />
                <ellipse cx="39" cy="92" rx="2.8" ry="4.2" fill={stripe} /><ellipse cx="81" cy="92" rx="2.8" ry="4.2" fill={stripe} />
                {/* wide butterfly band over the shoulders */}
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
        {white === "high" && <path d="M96 74 C102 70 108 78 104 86 C100 84 96 80 96 74 Z" fill={main} />}{white === "van" && (<g><rect width="120" height="120" fill={WHITE} /><g fill={main}><path d={EAR_L} /><path d={EAR_R} /><path d="M34 44 C34 26 46 22 60 22 C74 22 86 26 86 44 C74 36 46 36 34 44 Z" /><path d={TAIL} /></g></g>)}{white === "mitted" && (<g fill={WHITE}><path d="M49 100 H58 V110 H49 Z M62 100 H71 V110 H62 Z" /><ellipse cx="60" cy="59" rx="7" ry="4.5" /></g>)}
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

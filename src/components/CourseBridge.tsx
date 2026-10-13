import { Link } from "@tanstack/react-router";

/**
 * Soft bridge: at the end of a free module, point the student at the paid
 * course that goes deeper on what they just read. One card, one course, one
 * reason. Nothing expires and nothing is pushed — the next step is just visible.
 *
 * Keyed by module id, because modules have no slug column; the route param
 * that looks like a slug is really the module's uuid.
 *
 * To change a bridge, edit the line here. To remove one, delete its entry.
 */

type Bridge = { slug: string; title: string; reason: string };

const BRIDGES: Record<string, Bridge> = {
  // 101 · The Foundations Course
  "3a6f9f92-fdec-46e0-9338-67019afc601f": {
    slug: "breeder-ethics-program-planning",
    title: "203 · Breeder Ethics and Program Planning",
    reason:
      "Deciding to breed is one question. Deciding what kind of breeder to be is the harder one.",
  },
  "e1c95430-de16-452e-96bd-8f6cbe01e311": {
    slug: "breeder-ethics-program-planning",
    title: "203 · Breeder Ethics and Program Planning",
    reason:
      "The costs are real. Planning a program is how you stop reacting to whatever litter arrives.",
  },
  "50133dd8-7c53-482c-b599-859ad9c438fa": {
    slug: "pregnancy-queening-neonatal",
    title: "302 · Pregnancy, Queening and Neonatal Care",
    reason:
      "Most of those hours are spent around a birth. This is what you will actually be doing in them.",
  },
  "5adceca8-c372-4729-ba99-a8add70405ce": {
    slug: "colour-theory-registry-codes",
    title: "Colour Theory and Registry Codes",
    reason:
      "Registration papers are written in colour codes. This course teaches you to read and write them.",
  },
  "9b3dc38d-bbfe-44ef-abeb-4b7f63952653": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "A good space keeps cats well. Food, vaccines and parasite control are the rest of that job.",
  },
  "69c3669e-5aea-4b88-b371-a8675551d59f": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "Keeping pathogens out is half of it. Vaccination and parasite control are the other half.",
  },
  "3642d376-0b57-428f-a8ea-32f4cb8dc1b1": {
    slug: "feline-anatomy-physiology",
    title: "201 · Feline Anatomy and Physiology",
    reason:
      "Everything else in the catalogue assumes you know how a cat is built. Start here.",
  },

  // 103 · Common Breeder Health Issues
  "0491ea2a-e458-5119-b008-a01f2f9546af": {
    slug: "breeding-reproductive-physiology",
    title: "301 · Breeding and Reproductive Physiology",
    reason:
      "Pyometra is one emergency. 301 covers the whole reproductive system, including why it happens.",
  },
  "c4ef1074-4c03-5218-b9ac-0afa752261ea": {
    slug: "pregnancy-queening-neonatal",
    title: "302 · Pregnancy, Queening and Neonatal Care",
    reason:
      "Mastitis happens while you are also managing a litter. 302 covers that whole period.",
  },
  "ef6b3bbb-febc-5a1d-8459-bca95a10aa80": {
    slug: "pregnancy-queening-neonatal",
    title: "302 · Pregnancy, Queening and Neonatal Care",
    reason:
      "The navel is one of several things to watch in a newborn. 302 covers the first weeks properly.",
  },
  "5651cf50-ba65-52ed-a909-f94fcc205b89": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "Respiratory bugs are mostly a vaccination and management problem. That is what 102 teaches.",
  },
  "f1125ca1-87f2-548e-bd2d-22328f8f0d23": {
    slug: "pregnancy-queening-neonatal",
    title: "302 · Pregnancy, Queening and Neonatal Care",
    reason:
      "A greasy kitten is usually a kitten in trouble. 302 covers spotting that early.",
  },
  "38551179-74cc-5306-9ef8-de6d46ea963f": {
    slug: "breeding-reproductive-physiology",
    title: "301 · Breeding and Reproductive Physiology",
    reason:
      "A blocked male is an emergency. 301 covers stud health and breeding soundness before it gets there.",
  },
  "cc4c3cef-12a9-5f93-ac85-01e76255fc02": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "Knowing when an eye is an emergency is part of reading a cat. 102 covers early signs of illness and pain.",
  },
  "e450fcbf-8a7f-5adf-b74e-70301fe6fd0e": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "Most dewormers miss giardia entirely. 102 covers which drug covers which parasite.",
  },
  "4cf68ab0-d01d-5927-8e5a-c97584f00a14": {
    slug: "breeder-ethics-program-planning",
    title: "203 · Breeder Ethics and Program Planning",
    reason:
      "Herpes is lifelong, which makes it a disclosure question as much as a medical one.",
  },
  "64da74d8-6e0f-5f5a-9e8e-855eb0286109": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "Calicivirus is what vaccination protocols are built around. 102 covers what a kitten actually needs and when.",
  },
  "45e514ef-57d7-5b13-a937-058e2a35d336": {
    slug: "breeder-ethics-program-planning",
    title: "203 · Breeder Ethics and Program Planning",
    reason:
      "A positive result that does not mean sick is exactly where breeders mislead each other.",
  },
  "584d3da8-58b9-5c12-92dc-4e44ec98049a": {
    slug: "everyday-health-nutrition",
    title: "102 · Everyday Health and Nutrition",
    reason:
      "Frustrating to treat, easy to spread. 102 covers the parasite control that keeps it out.",
  },
  "fb6a6386-1ad4-5ffc-bb85-52438dfe3b96": {
    slug: "selection-pedigrees-population-health",
    title: "303 · Selection, Pedigrees and Population Health",
    reason:
      "FIP risk sits partly in the line. 303 covers what selection does to a population over generations.",
  },
};

export function CourseBridge({ moduleSlug }: { courseSlug?: string; moduleSlug: string }) {
  const bridge = BRIDGES[moduleSlug];
  if (!bridge) return null;

  return (
    <div className="rounded-lg border border-[#E8E4DD] bg-white p-4">
      <p className="text-sm text-[#5A5A5A] leading-relaxed">{bridge.reason}</p>
      <Link
        to="/academy/$courseSlug"
        params={{ courseSlug: bridge.slug }}
        className="mt-2 inline-block text-sm font-semibold text-[#C8102E] hover:text-[#8C0C21]"
      >
        {bridge.title}
      </Link>
    </div>
  );
}

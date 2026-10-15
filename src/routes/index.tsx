import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

const FEATURES = [
  {
    title: "Health records that stay put",
    body: "Vaccinations, test results, vet visits and documents attached to the cat they belong to — not scattered across a filing cabinet and three phones.",
  },
  {
    title: "Pedigrees and registrations",
    body: "Registration numbers, parentage and pedigree documents on every cat, so a buyer's question takes seconds instead of an evening.",
  },
  {
    title: "Matings, due dates and the birth log",
    body: "Forecast the due window from the first mating date, then log every kitten and every placenta as it happens — one tap each, at three in the morning.",
  },
  {
    title: "Kittens, contracts and buyers",
    body: "Each kitten's colour, sex, price, sale rights and signed contract in one place, from birth to the day they go home.",
  },
];

function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A1A]">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <img src="/crest.webp" alt="" className="h-9 w-auto" />
          <span className="text-base font-semibold tracking-tight">
            Cattery Manager
          </span>
        </div>
        <Link
          to="/auth"
          className="rounded-md border border-[#E8E4DD] px-4 py-2 text-sm font-medium transition-colors hover:border-[#C8102E] hover:text-[#C8102E]"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-14 pt-8 text-center sm:pt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8102E]">
          Cat College
        </p>

        <h1 className="mt-5 font-serif text-3xl font-bold leading-tight sm:text-5xl">
          &ldquo;I wrote the course I wish someone had handed me before my first litter.&rdquo;
        </h1>

        <p className="mt-5 text-base text-[#4A4A4A]">
          Allison Payne &middot; Maine Coon breeder &middot; Kingston, Ontario
        </p>

        <p className="mx-auto mt-6 max-w-xl text-base text-[#4A4A4A] sm:text-lg">
          Start with two free courses: <em>Foundations of Cat Breeding</em> and{" "}
          <em>Common Breeder Health Issues</em>. Free account, no credit card.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth?mode=signup"
            className="w-full rounded-md bg-[#C8102E] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#A50D26] sm:w-auto"
          >
            Start the free course
          </Link>
        </div>

        <a
          href="#app"
          className="mt-6 inline-block text-sm text-[#5A5A5A] underline underline-offset-4 hover:text-[#C8102E]"
        >
          Here for the records app? See Cattery Manager &darr;
        </a>
      </section>
      {/* Cat College screenshots */}
      <section className="border-t border-[#E8E4DD] bg-white/60">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-center text-2xl sm:text-3xl">Cat College, built right in</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[#4A4A4A]">
            Work at your own pace, with quizzes as you go and a certificate at the end.
          </p>
          <div className="mx-auto mt-10 grid max-w-sm gap-10 sm:max-w-none sm:grid-cols-3 sm:gap-7">
            {[
              { src: "/app-academy-dashboard.webp", title: "Your learning, tracked", body: "Pick up wherever you left off. Progress saves itself." },
              { src: "/app-academy-101-modules.webp", title: "Eight modules before your first litter", body: "Including the parts that talk people out of it." },
              { src: "/app-academy-103-modules.webp", title: "Thirteen problems, written properly", body: "What it is, and whether you phone the vet now or in the morning." },
            ].map((s) => (
              <figure key={s.src} className="mx-auto w-full max-w-[18rem]">
                <div className="overflow-hidden rounded-[1.75rem] border-[6px] border-[#1A1A1A] bg-[#1A1A1A] shadow-xl">
                  <img src={s.src} alt={s.title} width={560} height={800} loading="lazy" className="block w-full rounded-[1.25rem]" />
                </div>
                <figcaption className="mt-4 text-center">
                  <div className="font-semibold">{s.title}</div>
                  <p className="mt-1 text-sm text-[#4A4A4A]">{s.body}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Free courses */}
      <section className="border-y border-[#E8E4DD] bg-white/60">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-center text-2xl sm:text-3xl">
            Start with two free courses
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[#4A4A4A]">
            Cat College is the teaching side of Cattery Manager. These two cost
            nothing, and you can read them before you decide about anything else.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border-l-4 border-l-[#C8102E] border-y border-r border-[#E8E4DD] bg-[#FAF7F2] p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#C8102E]">
                Free
              </div>
              <h3 className="mt-1.5 text-xl">Foundations of Cat Breeding</h3>
              <p className="mt-2 text-[#4A4A4A]">
                For anyone thinking about their first litter. What it really
                costs, what it asks of you, and how to decide honestly whether
                breeding is right for you.
              </p>
            </div>

            <div className="rounded-lg border-l-4 border-l-[#C8102E] border-y border-r border-[#E8E4DD] bg-[#FAF7F2] p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#C8102E]">
                Free
              </div>
              <h3 className="mt-1.5 text-xl">Common Breeder Health Issues</h3>
              <p className="mt-2 text-[#4A4A4A]">
                The problems that actually turn up in catteries — what to watch
                for, what to do about it, and when it is time to call your vet.
              </p>
            </div>
          </div>

          <div className="mt-7 text-center">
            <Link
              to="/courses"
              className="font-semibold text-[#C8102E] underline underline-offset-4 hover:text-[#8C0C21]"
            >
              See all ten courses
            </Link>
          </div>
        </div>
      </section>
      <div id="app" />

      {/* Screenshots */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="text-center text-2xl sm:text-3xl">Cattery Manager, the records app</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[#4A4A4A]">
          Health, pedigrees, matings, litters and kittens, on your phone and your desktop. Nothing to install.
        </p>
        <div className="mx-auto mt-10 grid max-w-sm gap-10 sm:max-w-none sm:grid-cols-3 sm:gap-7">
          {[
            { src: "/app-cat-profile.webp", title: "Every record for every cat, in your pocket", body: "Pedigrees, health tests and litters, beautifully organized." },
            { src: "/app-health-records.webp", title: "HCM, hips, DNA. Ready when a buyer asks", body: "Upload the reports once. Find them in seconds, anywhere." },
            { src: "/app-share-pedigree.webp", title: "Send a pedigree straight from your phone", body: "The organized paperwork of a reputable breeder." },
          ].map((s) => (
            <figure key={s.src} className="mx-auto w-full max-w-[18rem]">
              <div className="overflow-hidden rounded-[1.75rem] border-[6px] border-[#1A1A1A] bg-[#1A1A1A] shadow-xl">
                <img src={s.src} alt={s.title} width={560} height={800} loading="lazy" className="block w-full rounded-[1.25rem]" />
              </div>
              <figcaption className="mt-4 text-center">
                <div className="font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-[#4A4A4A]">{s.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Free tools */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl sm:text-3xl">Two free tools, no account needed</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[#4A4A4A]">
          Use both of these right now, without signing up for anything.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border-l-4 border-l-[#C8102E] border-y border-r border-[#E8E4DD] bg-white/60 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#C8102E]">Free tool</div>
            <h3 className="mt-1.5 text-xl">What colour kittens will you get?</h3>
            <p className="mt-2 text-[#4A4A4A]">
              Pick the queen and the stud, then see every kitten colour with real
              odds. Every gene, an EMS code for each kitten, eighteen breeds and
              polydactyl.
            </p>
            <Link to="/predictor" className="mt-4 inline-block font-semibold text-[#C8102E] underline underline-offset-4 hover:text-[#8C0C21]">
              Try the Colour Predictor
            </Link>
          </div>
          <div className="rounded-lg border-l-4 border-l-[#C8102E] border-y border-r border-[#E8E4DD] bg-white/60 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#C8102E]">Free game</div>
            <h3 className="mt-1.5 text-xl">Can you read an EMS code?</h3>
            <p className="mt-2 text-[#4A4A4A]">
              Nine levels that get harder as you go. Pick your own breed or play
              all of them, with the colour key beside you until you stop needing
              it.
            </p>
            <Link to="/learn-ems" className="mt-4 inline-block font-semibold text-[#C8102E] underline underline-offset-4 hover:text-[#8C0C21]">
              Play the EMS game
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl sm:text-3xl">
          Built around how breeding actually goes
        </h2>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-[#E8E4DD] bg-white/60 p-5"
            >
              <h3 className="text-lg">{f.title}</h3>
              <p className="mt-2 text-[#4A4A4A]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center"><h2 className="font-serif text-2xl font-bold sm:text-3xl">Start with the two free courses</h2><p className="mx-auto mt-3 max-w-xl text-base text-[#4A4A4A]">Foundations of Cat Breeding and Common Breeder Health Issues. Free account, no credit card.</p><Link to="/auth" className="mt-7 inline-block w-full rounded-md bg-[#C8102E] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#A50D26] sm:w-auto">Create your free account</Link></section>

      {/* Footer */}
      <footer className="border-t border-[#E8E4DD]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-5 py-8 text-sm text-[#5A5A5A] sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img src="/crest.webp" alt="" className="h-7 w-auto" />
            <span>Cattery Manager — Kingston, Ontario</span>
          </div>
          <div className="flex gap-5">
            <Link to="/courses" className="hover:text-[#C8102E]">
              Courses
            </Link>
            <Link to="/auth" className="hover:text-[#C8102E]">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

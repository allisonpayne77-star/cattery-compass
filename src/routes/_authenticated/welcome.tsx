import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/welcome")({
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Hero */}
      <section className="bg-[#1A1A1A] px-6 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-4xl">
          <img
            src="/catcollege-logo.png"
            alt="Cat College"
            className="h-16 w-auto sm:h-24"
          />

          <h1 className="mt-8 text-[2.75rem] font-bold leading-[0.98] tracking-[-0.03em] text-white sm:text-[5.5rem]">
            Written by a breeder,
            <br />
            for breeders.
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-2xl sm:leading-relaxed">
            Ten courses on everything that happens after you decide to breed &mdash;
            the genetics, the queening, the health testing, the hard calls.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/academy"
              className="flex min-h-[3.75rem] items-center justify-center rounded-full bg-[#C8102E] px-10 text-lg font-semibold tracking-tight text-white transition-colors hover:bg-[#8C0C21] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Browse the courses
            </Link>
            <Link
              to="/"
              className="flex min-h-[3.75rem] items-center justify-center rounded-full border border-white/25 px-10 text-lg font-semibold tracking-tight text-white transition-colors hover:bg-white hover:text-[#1A1A1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E]"
            >
              Take me to Cattery Manager
            </Link>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="mx-auto max-w-4xl px-6 sm:px-8">
        <dl className="-mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-[#E8E4DD] shadow-sm">
          {[
            ["10", "courses"],
            ["100+", "lessons"],
            ["2", "free to start"],
          ].map(([n, label]) => (
            <div key={label} className="bg-white px-4 py-7 text-center sm:py-10">
              <dt className="text-3xl font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-5xl">
                {n}
              </dt>
              <dd className="mt-1.5 text-xs text-[#4A4A4A] sm:text-base">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-2xl px-6 py-20 sm:px-8 sm:py-28">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#1A1A1A] sm:text-5xl">
          Why I built this
        </h2>

        <div className="mt-8 space-y-6 text-lg leading-[1.7] text-[#1A1A1A] sm:text-xl sm:leading-[1.7]">
          <p>
            I&rsquo;ve been breeding Maine Coons for six years. When I started,
            the courses I could find were either aimed at people who already
            knew the genetics, or so complex they were hard to understand at
            all.
          </p>
          <p>
            Nothing taught the practical side. What actually happens at 3am.
            What to do when a kitten fades. What the test results on your own
            cat mean.
          </p>
          <p className="text-2xl font-bold leading-snug tracking-[-0.02em] text-[#C8102E] sm:text-4xl">
            So I wrote what I wish I&rsquo;d had.
          </p>
          <p>
            Real situations from real catteries, and a quiz at the end of every
            module so it sticks.
          </p>
        </div>

        <Link
          to="/academy"
          className="mt-12 flex min-h-[3.75rem] w-full items-center justify-center rounded-full bg-[#1A1A1A] px-10 text-lg font-semibold tracking-tight text-white transition-colors hover:bg-[#C8102E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8102E] sm:w-auto sm:self-start"
        >
          Start with the free course
        </Link>
      </section>
    </div>
  );
}

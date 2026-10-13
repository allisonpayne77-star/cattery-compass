import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const background = "/certificate-background-v2.png";
const seal = "/catcollege-logo.png";

export const Route = createFileRoute("/certificate/$courseSlug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Certificate — Cat College" }] }),
  component: CertificatePage,
});

type CourseRow = { id: string; title: string; slug: string };

function formatDate(d: Date) {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function CertificatePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { courseSlug } = Route.useParams();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [moduleCount, setModuleCount] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [catteryName, setCatteryName] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(true);

  const defaultName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const full = typeof meta.full_name === "string" ? meta.full_name : "";
    const alt = typeof meta.name === "string" ? meta.name : "";
    return full || alt || user?.email?.split("@")[0] || "";
  }, [user]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" as "/", replace: true });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data: c } = await supabase
        .from("courses").select("id, title, slug").eq("slug", courseSlug).maybeSingle();
      if (cancelled || !c) { setBusy(false); return; }
      setCourse(c as CourseRow);

      const { count } = await supabase
        .from("modules").select("id", { count: "exact", head: true })
        .eq("course_id", (c as CourseRow).id);
      if (!cancelled) setModuleCount(count ?? 0);

      const { data: prof } = await supabase
        .from("profiles").select("cattery_name").eq("id", user!.id).maybeSingle();
      if (!cancelled && prof?.cattery_name) setCatteryName(prof.cattery_name as string);

      const { data: prog } = await supabase
        .from("academy_progress").select("module_slug, completed_at, passed")
        .eq("user_id", user!.id).eq("course_slug", courseSlug).eq("passed", true);
      if (cancelled) return;
      const rows = prog ?? [];
      setPassedCount(new Set(rows.map((r: { module_slug: string }) => r.module_slug)).size);
      const dates = rows
        .map((r: { completed_at: string | null }) => (r.completed_at ? new Date(r.completed_at) : null))
        .filter((d): d is Date => !!d);
      setCompletedAt(dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null);
      setBusy(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, courseSlug]);

  useEffect(() => { if (!name && defaultName) setName(defaultName); }, [defaultName, name]);

  const complete = moduleCount > 0 && passedCount >= moduleCount;
  // Completion date comes from the real progress record. Only falls back to today
  // when a legacy row has no completed_at stored against it.
  const dateShown = completedAt ?? new Date();
  const courseTitle = course?.title ?? "";

  if (busy) {
    return <div className="p-10 text-center text-muted-foreground">Loading your certificate…</div>;
  }

  if (!course) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-muted-foreground">We couldn't find that course.</p>
        <Link to={"/academy" as "/"} className="text-primary font-medium hover:underline">
          Back to Cat College
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 py-8 print:bg-white print:py-0">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap"
      />
      <style>{`
        .cert-wrap { position: relative; width: 100%; max-width: 1123px; margin: 0 auto;
                     container-type: inline-size; }
        .cert-wrap img.cert-bg { display: block; width: 100%; height: auto; }

        .cert-field { position: absolute; transform: translate(-50%, -50%);
                      text-align: center; line-height: 1.15; }
        .cert-line  { position: absolute; transform: translate(-50%, -50%);
                      height: 1px; background: #c9ab6a; }

        .cert-college { left: 50%; top: 11.0%; font-family: "Fraunces", Georgia, serif;
                        font-size: 3.2cqw; color: #1A1A1A; white-space: nowrap; }
        .cert-title   { left: 50%; top: 17.6%; font-family: "Fraunces", Georgia, serif;
                        font-size: 2.3cqw; color: #8a6a2f; letter-spacing: 0.13em;
                        white-space: nowrap; }
        .cert-rule    { left: 50%; top: 21.8%; width: 40cqw; }

        .cert-presented { left: 50%; top: 28.6%; font-family: "Fraunces", Georgia, serif;
                          font-size: 1.35cqw; color: #545454; white-space: nowrap; }
        .cert-name      { left: 50%; top: 39.2%; font-family: "Great Vibes", cursive;
                          font-size: 7.0cqw; color: #1A1A1A; white-space: nowrap; }
        .cert-nameline  { left: 50%; top: 44.4%; width: 44cqw; }

        .cert-for     { left: 50%; top: 51.6%; font-family: "Fraunces", Georgia, serif;
                        font-size: 1.35cqw; color: #545454; white-space: nowrap; }
        .cert-course  { left: 50%; top: 57.4%; width: 78cqw; font-family: "Fraunces", Georgia, serif;
                        font-weight: 600; font-size: 2.3cqw; color: #8a6a2f;
                        letter-spacing: 0.05em; }
        .cert-cattery { left: 50%; top: 63.6%; width: 70cqw; font-family: "Fraunces", Georgia, serif;
                        font-size: 1.5cqw; color: #9c8043; letter-spacing: 0.20em; }

        .cert-seal    { position: absolute; left: 16%; top: 74.0%;
                        transform: translate(-50%, -50%); width: 15cqw; height: auto; }

        .cert-date      { left: 39%; top: 85.0%; font-family: "Fraunces", Georgia, serif;
                          font-size: 1.7cqw; color: #1A1A1A; white-space: nowrap; }
        .cert-dateline  { left: 39%; top: 88.4%; width: 22cqw; background: #8a6a2f; }
        .cert-datelabel { left: 39%; top: 90.8%; font-family: "Fraunces", Georgia, serif;
                          font-size: 1.0cqw; color: #545454; letter-spacing: 0.14em;
                          white-space: nowrap; }

        .cert-sig      { left: 78%; top: 84.4%; font-family: "Great Vibes", cursive;
                         font-size: 3.2cqw; color: #1A1A1A; white-space: nowrap; }
        .cert-sigline  { left: 78%; top: 88.4%; width: 22cqw; background: #8a6a2f; }
        .cert-siglabel { left: 78%; top: 90.8%; font-family: "Fraunces", Georgia, serif;
                         font-size: 1.0cqw; color: #545454; letter-spacing: 0.14em;
                         white-space: nowrap; }

        @media print {
          @page { size: letter landscape; margin: 0; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .cert-wrap { max-width: none; width: 100vw; }
        }
      `}</style>

      <div className="no-print mx-auto mb-6 max-w-3xl px-6 space-y-4">
        {complete ? (
          <div className="rounded-lg border-l-4 border-l-[#2E7D4F] bg-[#F1F7F3] px-4 py-3">
            <p className="font-display text-lg font-semibold">
              Congratulations — you've completed this course.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              All {moduleCount} modules complete. Your certificate is ready to print.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border-l-4 border-l-[#C9791A] bg-[#FBF6EE] px-4 py-3">
            <p className="font-display text-lg font-semibold">Not quite finished yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              You've completed {passedCount} of {moduleCount} modules. Finish the rest and your
              certificate unlocks here.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cert-name">Your name, as it should appear</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <Label htmlFor="cert-cattery">Cattery name, as it should appear</Label>
            <Input
              id="cert-cattery"
              value={catteryName}
              onChange={(e) => setCatteryName(e.target.value)}
              placeholder="Optional — leave blank to omit"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => window.print()} disabled={!complete}>
            Print / Save as PDF
          </Button>
          <span className="text-xs text-muted-foreground">
            Both names print exactly as typed here.
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          In the print dialog, choose Landscape and turn on background graphics.
        </p>
      </div>

      <div className="cert-wrap">
        <img className="cert-bg" src={background} alt="Cat College certificate" />

        <div className="cert-field cert-college">Cat College</div>
        <div className="cert-field cert-title">CERTIFICATE OF COMPLETION</div>
        <div className="cert-line cert-rule" />

        <div className="cert-field cert-presented">This certificate is proudly presented to</div>
        <div className="cert-field cert-name">{name}</div>
        <div className="cert-line cert-nameline" />

        <div className="cert-field cert-for">for the successful completion of</div>
        <div className="cert-field cert-course">{courseTitle.toUpperCase()}</div>
        {catteryName ? (
          <div className="cert-field cert-cattery">{catteryName}</div>
        ) : null}

        <img className="cert-seal" src={seal} alt="" />

        <div className="cert-field cert-date">{formatDate(dateShown)}</div>
        <div className="cert-line cert-dateline" />
        <div className="cert-field cert-datelabel">COMPLETION DATE</div>

        <div className="cert-field cert-sig">Allison Payne</div>
        <div className="cert-line cert-sigline" />
        <div className="cert-field cert-siglabel">AUTHORIZED SIGNATURE</div>
      </div>
    </div>
  );
}

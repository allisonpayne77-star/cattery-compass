import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const background = "/certificate-background.jpg";

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
  const dateShown = completedAt ?? new Date();
  const courseTitle = (course?.title ?? "").replace(/^\d+\s*[·•-]\s*/, "");

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
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap");
        .cert-wrap { position: relative; width: 100%; max-width: 1100px; margin: 0 auto; }
        .cert-wrap img.cert-bg { display: block; width: 100%; height: auto; }
        .cert-field { position: absolute; transform: translate(-50%, -50%); text-align: center;
                      white-space: nowrap; line-height: 1; }
        .cert-name   { left: 50%;    top: 43.40%; font-family: "Great Vibes", cursive;
                       color: #8C0C21; font-size: 4.4cqw; }
        .cert-course { left: 50%;    top: 58.00%; font-family: "Fraunces", Georgia, serif;
                       font-weight: 600; color: #C8102E; font-size: 2.1cqw; }
        .cert-date   { left: 22.75%; top: 87.30%; font-family: "Fraunces", Georgia, serif;
                       color: #1A1A1A; font-size: 1.35cqw; }
        .cert-wrap { container-type: inline-size; }
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

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[16rem]">
            <Label htmlFor="cert-name">Name as it should appear</Label>
            <Input id="cert-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => window.print()} disabled={!complete}>
            Print certificate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          In the print dialog, choose Landscape and turn on background graphics.
        </p>
      </div>

      <div className="cert-wrap">
        <img className="cert-bg" src={background} alt="Cat College certificate" />
        <div className="cert-field cert-name">{name}</div>
        <div className="cert-field cert-course">{courseTitle}</div>
        <div className="cert-field cert-date">{formatDate(dateShown)}</div>
      </div>
    </div>
  );
}

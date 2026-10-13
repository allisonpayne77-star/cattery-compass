import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAcademyCourse } from "@/lib/academy-data";
import { useAcademyProgress, courseStats } from "@/lib/academy-progress";

export const Route = createFileRoute("/_authenticated/academy/$courseSlug/certificate")({
  head: () => ({ meta: [{ title: "Certificate — Cat College" }] }),
  notFoundComponent: () => (
    <div className="max-w-xl mx-auto text-center py-16">
      <Button asChild><Link to="/academy">Back to Academy</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="max-w-xl mx-auto text-center py-16 text-destructive">{error.message}</div>
  ),
  component: CertificatePage,
});

function CertificatePage() {
  const { courseSlug } = Route.useParams();
  const courseQuery = useAcademyCourse(courseSlug);
  const course = courseQuery.data;
  const { user } = useAuth();
  const progress = useAcademyProgress();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("cattery_name")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (courseQuery.isLoading) {
    return <div className="max-w-xl mx-auto py-16 text-center text-muted-foreground">Loading certificate…</div>;
  }

  if (!course) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">This course is not in the uploaded Academy data.</p>
        <Button asChild><Link to="/academy">Back to Academy</Link></Button>
      </div>
    );
  }

  const stats = courseStats(progress.data, course);

  const eligible = stats.percent === 100;
  const name = profile.data?.cattery_name || user?.email || "Cattery";
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (!eligible) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">
          Complete every module in this course to unlock your certificate.
        </p>
        <Button asChild>
          <Link to="/academy/$courseSlug" params={{ courseSlug }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to course
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/academy/$courseSlug" params={{ courseSlug }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to course
          </Link>
        </Button>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
        </Button>
      </div>

      <Card className="p-10 sm:p-14 text-center bg-gradient-to-br from-background to-primary/5 border-2 border-primary/20">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary grid place-items-center mb-4">
          <Award className="h-8 w-8" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
          Cat College
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-1">
          Certificate of Completion
        </h1>
        <p className="text-muted-foreground mb-8">This certifies that</p>
        <p className="font-display text-2xl sm:text-3xl font-semibold mb-8">{name}</p>
        <p className="text-muted-foreground mb-2">has successfully completed the course</p>
        <p className="font-display text-xl sm:text-2xl mb-10">{course.title}</p>
        <div className="flex items-center justify-around text-sm pt-6 border-t max-w-md mx-auto">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Date</p>
            <p className="font-medium mt-1">{dateStr}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Modules</p>
            <p className="font-medium mt-1">
              {stats.completed} / {stats.total}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

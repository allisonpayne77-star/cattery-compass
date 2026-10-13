import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import type { AcademyCourse } from "@/lib/academy-data";

type Purchase = {
  course_id: string | null;
  is_bundle: boolean;
};

/** Everything this user has bought. RLS limits it to their own rows. */
export function useCoursePurchases() {
  return useQuery({
    queryKey: ["course-purchases"],
    queryFn: async (): Promise<Purchase[]> => {
      const { data, error } = await (supabase as any)
        .from("course_purchases")
        .select("course_id, is_bundle");
      if (error) throw error;
      return (data ?? []) as Purchase[];
    },
  });
}

/**
 * True when the signed-in user holds the admin role. The database already lets
 * admins read every course (see can_read_course), so the paywall must not hide
 * content from them.
 */
export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async (): Promise<boolean> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });
}

/**
 * A course is locked only if it costs something AND the user owns neither it
 * nor the bundle. Free courses (101 Foundations, 103) are never locked.
 * While purchases are still loading we return false, so a paid-up student
 * never sees the paywall flash on screen.
 */
export function useCourseLocked(course: AcademyCourse) {
  const purchases = useCoursePurchases();
  const isAdmin = useIsAdmin();

  if (course.priceCents === 0) return { locked: false, loading: false };
  if (purchases.isLoading || isAdmin.isLoading) return { locked: false, loading: true };
  if (isAdmin.data) return { locked: false, loading: false };

  const rows = purchases.data ?? [];
  const owned = rows.some((p) => p.is_bundle || p.course_id === course.id);
  return { locked: !owned, loading: false };
}

function money(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

export function CoursePaywall({ course }: { course: AcademyCourse }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(kind: "course" | "bundle") {
    setBusy(kind);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Please sign in again.");
        setBusy(null);
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind,
          courseId: course.id,
          courseSlug: course.slug,
        }),
      });

      const body = (await res.json()) as { url?: string; error?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      setError(body.error ?? "Could not start checkout.");
    } catch {
      setError("Could not reach the payment page. Please try again.");
    }
    setBusy(null);
  }

  return (
    <Card className="p-6 border-2 border-[#C8102E] bg-[#FBF3F4] space-y-4">
      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 text-[#C8102E] mt-0.5 shrink-0" />
        <div>
          <h2 className="font-display text-xl font-semibold">
            This course is locked
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Buy this course on its own, or get every paid course in Cat College
            for one price. Foundations and Common Breeder Health Issues stay
            free.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="h-12 flex-1 text-base"
          disabled={busy !== null}
          onClick={() => startCheckout("course")}
        >
          {busy === "course" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Buy this course — {money(course.priceCents)}
        </Button>
        <Button
          variant="outline"
          className="h-12 flex-1 text-base border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E] hover:text-white"
          disabled={busy !== null}
          onClick={() => startCheckout("bundle")}
        >
          {busy === "bundle" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          All courses — $149.99
        </Button>
      </div>

      {error ? <p className="text-sm text-[#B0212F]">{error}</p> : null}

      <p className="text-xs text-muted-foreground">
        Prices in Canadian dollars. Payment is handled by Stripe.
      </p>
    </Card>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
const appIcon = { url: "/catterymanager-logo.png" };

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Set a new password — Cattery Manager" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" as "/", replace: true });
  }, [user, loading, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're all set.");
      nav({ to: "/" as "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="mb-8 flex items-center gap-3">
        <img src={appIcon.url} alt="Cattery Manager" className="h-10 w-auto rounded-md brand-logo-image" />
        <span className="font-display font-semibold">Cattery Manager</span>
      </div>

      <Card className="w-full max-w-md p-8">
        <h2 className="font-display text-2xl font-semibold">Set a new password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose something you'll remember. You'll stay signed in afterwards.
        </p>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" className="h-4 w-4" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />Show passwords</label>
          <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

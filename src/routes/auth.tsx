import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { IosSafariAuthBanner } from "@/components/ios-safari-auth-banner";
const appIcon = { url: "/catterymanager-logo.png" };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search): { next?: string } => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — Cattery Manager" }] }),
  component: AuthPage,
});

function safeNext(next?: string) {
  if (!next || !next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//") || next.startsWith("/auth")) return "/dashboard";
  return next;
}

const AUTH_NEXT_STORAGE_KEY = "cattery-companion-auth-next";

function rememberNext(next: string) {
  try {
    window.sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, next);
  } catch {
    // If storage is unavailable, the callback safely falls back to the dashboard.
  }
}

function friendlyAuthError(err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  const m = raw.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "Please wait a minute before requesting another email.";
  if (m.includes("invalid login")) return "That email and password don't match. Check for typos, or reset your password.";
  if (m.includes("already registered") || m.includes("already been registered")) return "There's already an account with that email. Try signing in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email address first — check your inbox.";
  if (m.includes("password should be")) return "Your password needs to be at least 6 characters.";
  return raw || "Something went wrong. Please try again.";
}

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const next = safeNext(search.next);
  const emailRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  useEffect(() => { if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup"); }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  function start() {
    setMode("signup");
    setTimeout(() => emailRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!loading && user) nav({ to: next as "/", replace: true });
  }, [user, loading, nav, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/login-callback?next=${encodeURIComponent("/reset-password")}`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        toast.success("If an account exists for that email, a reset link is on its way. Check your spam folder if it doesn't arrive.");
        setMode("signin");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/login-callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: next as "/", replace: true });
      }
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  function showEmailFallback() {
    setMode("signin");
    setTimeout(() => emailRef.current?.focus(), 0);
  }

  async function google() {
    setBusy(true);
    rememberNext(next);
    const redirectTo = `${window.location.origin}/login-callback?next=${encodeURIComponent(next)}`;
    console.log("[auth] starting Google OAuth via Supabase", { redirectTo });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      console.error("[auth] signInWithOAuth error", error);
      toast.error("Google sign-in failed: " + error.message);
      setBusy(false);
    }
    // Supabase redirects the browser to Google — no further action needed here
  }

  const heading =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const subheading =
    mode === "signin"
      ? "Sign in to your cattery dashboard."
      : mode === "signup"
      ? "Start managing your cattery in minutes."
      : "Enter your email and we'll send you a link to set a new password.";
  const submitLabel =
    busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link";

  // People who came from the Cat College ad see the course pitch; members signing in see the records-app pitch.
  const isCatCollegeSignup = mode === "signup";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <img src={appIcon.url} alt="Cattery Manager" className="h-12 w-auto rounded-md brand-logo-image" />
          <span className="font-display text-lg font-semibold">Cattery Manager</span>
        </div>
        <div>
          {isCatCollegeSignup ? (
            <h1 className="font-display text-5xl font-semibold leading-tight">
              Learn to breed cats the right way. <span className="text-accent">Free.</span>
            </h1>
          ) : (
            <h1 className="font-display text-5xl font-semibold leading-tight">
              Your cattery, <span className="text-accent">beautifully</span> organized.
            </h1>
          )}
          {isCatCollegeSignup ? (
            <p className="mt-4 max-w-md text-primary-foreground/80">
              Two full courses, written by a Maine Coon breeder who has been where you are.
            </p>
          ) : (
            <p className="mt-4 max-w-md text-primary-foreground/80">
              LOG, LEARN, LOVE - All in one place.
            </p>
          )}

          <div className="mt-8 max-w-md rounded-xl bg-primary-foreground/10 p-5 backdrop-blur-sm border border-primary-foreground/10">
            {isCatCollegeSignup ? (
              <>
                <h2 className="font-display text-lg font-semibold leading-snug">
                  Sign up in under a minute. No credit card.
                </h2>
                <p className="mt-2 text-sm text-primary-foreground/80 leading-relaxed">
                  Your free account gives you Foundations of Cat Breeding and Common Breeder Health Issues, starting right away.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-lg font-semibold leading-snug">
                  Everything you need to know, right at your fingertips.
                </h2>
                <p className="mt-2 text-sm text-primary-foreground/80 leading-relaxed">
                  No scattered records. No missing health docs. No guesswork. Cattery Manager keeps every breeding, certificate, and course in one beautiful place — so you can focus on what matters most.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={start}
                >
                  Let's Get Started
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">© Cattery Manager</p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="lg:hidden mb-8 text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={appIcon.url} alt="Cattery Manager" className="h-10 w-auto rounded-md brand-logo-image" />
            <span className="font-display font-semibold">Cattery Manager</span>
          </div>
          {isCatCollegeSignup ? (
            <>
              <h1 className="font-display text-4xl font-semibold leading-tight">
                Learn to breed cats the right way. <span className="text-primary">Free.</span>
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">
                Two full courses, written by a Maine Coon breeder who has been where you are.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-5xl font-semibold leading-tight">
                Your cattery, <span className="text-primary">beautifully</span> organized.
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">
                LOG, LEARN, LOVE - All in one place.
              </p>
            </>
          )}
        </div>

        <Card className="w-full max-w-md p-8">
          <h2 className="font-display text-2xl font-semibold">{heading}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subheading}</p>

          <IosSafariAuthBanner />

          {mode !== "reset" ? (
            <>
              <Button type="button" variant="outline" className="w-full mt-4" onClick={google} disabled={busy}>
                {busy ? "Redirecting to Google…" : "Continue with Google"}
              </Button>

              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={showEmailFallback} disabled={busy}>
                Use email instead
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" ref={emailRef} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode !== "reset" ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" ? (
                    <button
                      type="button"
                      className="text-xs text-primary font-medium hover:underline"
                      onClick={() => setMode("reset")}
                      disabled={busy}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <div className="relative"><Input id="password" type={showPw ? "text" : "password"} required minLength={6} className="pr-16" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-0 top-0 h-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground">{showPw ? "Hide" : "Show"}</button></div>
              </div>
            ) : null}
            <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
              {submitLabel}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "reset" ? (
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setMode("signin")}
              >
                Back to sign in
              </button>
            ) : (
              <>
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { IosSafariAuthBanner } from "@/components/ios-safari-auth-banner";
const appIcon = { url: "/catterymanager-logo.png" };

type CallbackSearch = { next?: string };

export const Route = createFileRoute("/login-callback")({
  ssr: false,
  validateSearch: (search): CallbackSearch => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({ meta: [{ title: "Signing in — Cattery Manager" }] }),
  component: AuthCallbackPage,
});

function safeNext(next?: string) {
  if (!next || !next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//") || next.startsWith("/auth")) return "/dashboard";
  return next;
}

const AUTH_NEXT_STORAGE_KEY = "cattery-companion-auth-next";

export function getRememberedNext() {
  try {
    return window.sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function clearRememberedNext() {
  try {
    window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

type Phase = "verifying" | "waiting" | "success" | "timeout";

async function completeReturnedGoogleSession() {
  const url = new URL(window.location.href);
  const errorDescription = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (errorDescription) {
    console.error("[login-callback] provider returned error:", errorDescription);
    throw new Error(errorDescription);
  }

  const code = url.searchParams.get("code");
  if (code) {
    console.log("[login-callback] exchanging ?code for session");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[login-callback] exchangeCodeForSession failed:", error);
      throw error;
    }
    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    console.log("[login-callback] setting session from URL hash tokens");
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error("[login-callback] setSession failed:", error);
      throw error;
    }
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }

  if (!code && !accessToken) {
    console.log("[login-callback] no code/hash tokens — relying on broker-set session");
  }
}

function AuthCallbackPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const destination = useMemo(() => safeNext(search.next ?? getRememberedNext()), [search.next]);
  const [phase, setPhase] = useState<Phase>("verifying");
  const [countdown, setCountdown] = useState(2);
  const redirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    console.log("[login-callback] mounted", {
      href: window.location.href,
      destination,
      hasHash: !!window.location.hash,
      hasCode: new URL(window.location.href).searchParams.has("code"),
    });

    function goToDestination() {
      if (redirectedRef.current || cancelled) return;
      redirectedRef.current = true;
      console.log("[login-callback] session ready → navigating to", destination);
      setPhase("success");
      let n = 2;
      setCountdown(n);
      const tick = setInterval(() => {
        n -= 1;
        setCountdown(n);
        if (n <= 0) {
          clearInterval(tick);
          clearRememberedNext();
          nav({ to: destination as "/", replace: true });
        }
      }, 500);
    }

    async function check() {
      try {
        await completeReturnedGoogleSession();
      } catch (error) {
        console.error("[login-callback] completeReturnedGoogleSession threw", error);
      }

      const { data } = await supabase.auth.getSession();
      console.log("[login-callback] initial getSession →", !!data.session);
      if (cancelled) return;
      if (data.session) {
        goToDestination();
        return;
      }
      setPhase("waiting");
      let polls = 0;
      poll = setInterval(async () => {
        polls += 1;
        const { data: r } = await supabase.auth.getSession();
        if (polls % 5 === 0) console.log("[login-callback] poll", polls, "session?", !!r.session);
        if (!cancelled && r.session) goToDestination();
      }, 400);
      timeoutId = setTimeout(() => {
        if (!cancelled && !redirectedRef.current) {
          console.warn("[login-callback] timed out waiting for session");
          setPhase("timeout");
        }
      }, 10000);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[login-callback] onAuthStateChange", event, "hasSession?", !!session);
      if (!cancelled && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        goToDestination();
      }
    });

    check();
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (timeoutId) clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [destination, nav]);

  const steps = [
    { key: "verifying", label: "Verifying Google sign-in" },
    { key: "waiting", label: "Creating your session" },
    { key: "success", label: "Redirecting you" },
  ] as const;

  const currentIndex = phase === "success" ? 2 : phase === "waiting" ? 1 : 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center">
        <img
          src={appIcon.url}
          alt="Cattery Manager"
          className="brand-logo-image mx-auto h-16 w-auto rounded-md"
        />

        <h1 className="mt-6 text-xl font-semibold text-foreground">
          {phase === "success" ? "You're signed in" : phase === "timeout" ? "Taking longer than expected" : "Signing you in…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "success"
            ? `Redirecting in ${countdown}…`
            : phase === "timeout"
            ? "We couldn't confirm your session automatically."
            : "Hang tight — this usually takes a couple of seconds."}
        </p>

        {phase !== "timeout" && (
          <ul className="mt-6 space-y-3 text-left">
            {steps.map((s, i) => {
              const done = i < currentIndex || phase === "success";
              const active = i === currentIndex && phase !== "success";
              return (
                <li key={s.key} className="flex items-center gap-3 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : active ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted" />
                  )}
                  <span className={done || active ? "text-foreground" : "text-muted-foreground"}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {phase === "timeout" && (
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span className="text-foreground">
                Google finished, but this page could not confirm the app session yet. Try continuing once, or go back and sign in again.
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { clearRememberedNext(); nav({ to: destination as "/", replace: true }); }}>
                Continue anyway
              </Button>
              <Button
                variant="outline"
                onClick={() => nav({ to: "/auth", search: { next: destination }, replace: true })}
              >
                Back to sign in
              </Button>
            </div>
          </div>
        )}

        <IosSafariAuthBanner />
      </div>
    </div>
  );
}

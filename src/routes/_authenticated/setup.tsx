import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Set up your cattery — Cattery Manager" }] }),
  component: SetupPage,
});

/** Shown in the breed box as suggestions; anything may be typed. */
const BREEDS = [
  "Maine Coon", "Ragdoll", "Bengal", "British Shorthair", "Persian",
  "Siamese", "Sphynx", "Scottish Fold", "Norwegian Forest Cat", "Siberian",
  "Abyssinian", "Birman", "Devon Rex", "Oriental Shorthair", "Russian Blue",
];

const REGISTRIES = [
  "TICA", "CFA", "CCA-AFC", "ACFA", "FIFe", "GCCF", "WCF", "Not registered", "Other",
];

export const SETUP_SKIPPED_KEY = "cm.setup.skipped";

function SetupPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [catteryName, setCatteryName] = useState("");
  const [breed, setBreed] = useState("");
  const [multipleBreeds, setMultipleBreeds] = useState(false);
  const [registry, setRegistry] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from whatever we already know about them.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const meta = (user!.user_metadata ?? {}) as Record<string, unknown>;
      const full =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        "";
      const parts = full.trim().split(/\s+/).filter(Boolean);
      if (!cancelled && parts.length) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      }

      const { data } = await supabase
        .from("profiles")
        .select("cattery_name, breed, multiple_breeds, registration_body, registration_number")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!cancelled && data) {
        setCatteryName((data.cattery_name as string) ?? "");
        setBreed((data.breed as string) ?? "");
        setMultipleBreeds(Boolean(data.multiple_breeds));
        setRegistry((data.registration_body as string) ?? "");
        setRegistrationNumber((data.registration_number as string) ?? "");
      }
      if (!cancelled) setLoadingProfile(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" as "/", replace: true });
  }, [user, loading, nav]);

  function skip() {
    try { localStorage.setItem(SETUP_SKIPPED_KEY, "1"); } catch { /* ignore */ }
    nav({ to: "/dashboard" as "/", replace: true });
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

      if (fullName) {
        const { error: authErr } = await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
        if (authErr) throw authErr;
      }

      const fields = {
        cattery_name: catteryName.trim() || null,
        breed: breed.trim() || null,
        multiple_breeds: multipleBreeds,
        registration_body: registry || null,
        registration_number: registrationNumber.trim() || null,
      };

      const { data: existing } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).maybeSingle();

      if (existing?.id) {
        const { error: upErr } = await supabase
          .from("profiles").update(fields).eq("id", existing.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("profiles").insert({ user_id: user.id, ...fields });
        if (insErr) throw insErr;
      }

      try { localStorage.removeItem(SETUP_SKIPPED_KEY); } catch { /* ignore */ }
      nav({ to: "/dashboard" as "/", replace: true });
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Something went wrong saving your details.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || loadingProfile) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Tell us about your cattery</h1>
        <p className="mt-2 text-muted-foreground">
          This fills in your certificates, pedigrees and kitten paperwork, so you only
          type it once. You can change any of it later from your profile.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Allison"
                autoComplete="given-name"
              />
            </div>
            <div>
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Payne"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cattery">Cattery name</Label>
            <Input
              id="cattery"
              value={catteryName}
              onChange={(e) => setCatteryName(e.target.value)}
              placeholder="Sweetheart Ragdolls"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Exactly as you want it to appear in print.
            </p>
          </div>

          <div>
            <Label htmlFor="breed">Breed</Label>
            <Input
              id="breed"
              list="breed-options"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="Maine Coon"
            />
            <datalist id="breed-options">
              {BREEDS.map((b) => <option key={b} value={b} />)}
            </datalist>

            <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-[#C8102E]"
                checked={multipleBreeds}
                onChange={(e) => setMultipleBreeds(e.target.checked)}
              />
              I breed more than one breed
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="registry">Registry</Label>
              <select
                id="registry"
                value={registry}
                onChange={(e) => setRegistry(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a registry…</option>
                {REGISTRIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="reg-number">Cattery registration number</Label>
              <Input
                id="reg-number"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border-l-4 border-l-destructive bg-destructive/5 px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save and continue"}
            </Button>
            <Button variant="ghost" onClick={skip} disabled={saving}>
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

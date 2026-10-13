import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * First-run cattery setup. Opens by itself when the signed-in user has no
 * cattery name yet, and can be skipped. What it collects is reused on
 * certificates, pedigrees and kitten paperwork.
 */

const BREEDS = [
  "Maine Coon", "Ragdoll", "Bengal", "British Shorthair", "Persian",
  "Siamese", "Sphynx", "Scottish Fold", "Norwegian Forest Cat", "Siberian",
  "Abyssinian", "Birman", "Devon Rex", "Oriental Shorthair", "Russian Blue",
];

const COUNTRIES = [
  "Canada", "United States", "United Kingdom", "Ireland", "Australia",
  "New Zealand", "France", "Germany", "Netherlands", "Sweden",
];

const REGISTRIES = [
  "TICA", "CFA", "CCA-AFC", "ACFA", "FIFe", "GCCF", "WCF", "Not registered", "Other",
];

/** Per-user, so one person skipping does not silence it for everyone on a shared computer. */
const skipKey = (userId: string) => `cm.setup.v3.skipped.${userId}`;

export function SetupDialog() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [catteryName, setCatteryName] = useState("");
  const [breed, setBreed] = useState("");
  const [multipleBreeds, setMultipleBreeds] = useState(false);
  const [registry, setRegistry] = useState("");
  const [country, setCountry] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user;
      if (!u || cancelled) return;
      setUserId(u.id);

      let skipped = false;
      try { skipped = localStorage.getItem(skipKey(u.id)) === "1"; } catch { /* ignore */ }
      if (skipped) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, cattery_name, breed, multiple_breeds, registration_body, country")
        .eq("user_id", u.id)
        .maybeSingle();

      if (cancelled) return;

      // Load whatever already exists, so saving never wipes a field.
      if (prof) {
        setProfileId(prof.id as string);
        setCatteryName((prof.cattery_name as string) ?? "");
        setBreed((prof.breed as string) ?? "");
        setMultipleBreeds(Boolean(prof.multiple_breeds));
        setRegistry((prof.registration_body as string) ?? "");
        setCountry((prof.country as string) ?? "");
      }

      // Already set up? Leave them alone.
      if (prof?.cattery_name) return;

      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const full =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) || "";
      const parts = full.trim().split(/\s+/).filter(Boolean);
      if (parts.length) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      }

      setOpen(true);
    }

    check();
    return () => { cancelled = true; };
  }, []);

  function skip() {
    try { if (userId) localStorage.setItem(skipKey(userId), "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  async function save() {
    if (!userId) return;
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
        country: country.trim() || null,
      };

      if (profileId) {
        const { error: upErr } = await supabase
          .from("profiles").update(fields).eq("id", profileId);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("profiles").insert({ user_id: userId, ...fields });
        if (insErr) throw insErr;
      }

      try { localStorage.removeItem(skipKey(userId)); } catch { /* ignore */ }
      setOpen(false);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong saving your details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Welcome — tell us about your cattery
          </DialogTitle>
          <DialogDescription>
            This fills in your certificates, pedigrees and kitten paperwork, so you
            only type it once. You can change it any time from your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sd-first">First name</Label>
              <Input id="sd-first" value={firstName} autoComplete="given-name"
                     onChange={(e) => setFirstName(e.target.value)} placeholder="Allison" />
            </div>
            <div>
              <Label htmlFor="sd-last">Last name</Label>
              <Input id="sd-last" value={lastName} autoComplete="family-name"
                     onChange={(e) => setLastName(e.target.value)} placeholder="Payne" />
            </div>
          </div>

          <div>
            <Label htmlFor="sd-cattery">Cattery name</Label>
            <Input id="sd-cattery" value={catteryName}
                   onChange={(e) => setCatteryName(e.target.value)}
                   placeholder="Sweetheart Ragdolls" />
            <p className="mt-1 text-xs text-muted-foreground">
              Exactly as you want it to appear in print.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sd-breed">Breed</Label>
              <Input id="sd-breed" list="sd-breed-options" value={breed}
                     onChange={(e) => setBreed(e.target.value)} placeholder="Maine Coon" />
              <datalist id="sd-breed-options">
                {BREEDS.map((b) => <option key={b} value={b} />)}
              </datalist>
              <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={multipleBreeds}
                       className="h-4 w-4 rounded border-input accent-[#C8102E]"
                       onChange={(e) => setMultipleBreeds(e.target.checked)} />
                More than one breed
              </label>
            </div>

            <div>
              <Label htmlFor="sd-country">Country</Label>
              <Input id="sd-country" list="sd-country-options" value={country}
                     autoComplete="country-name"
                     onChange={(e) => setCountry(e.target.value)} placeholder="Canada" />
              <datalist id="sd-country-options">
                {COUNTRIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <Label htmlFor="sd-registry">Registry</Label>
              <select
                id="sd-registry"
                value={registry}
                onChange={(e) => setRegistry(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a registry…</option>
                {REGISTRIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border-l-4 border-l-destructive bg-destructive/5 px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={skip} disabled={saving}>
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SetupDialog;

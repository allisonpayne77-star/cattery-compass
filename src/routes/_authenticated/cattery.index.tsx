import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Cat as CatIcon,
  HeartPulse,
  CalendarClock,
  Baby,
  Plus,
  Pencil,
  Save,
  Stethoscope,
  FileText,
  ArrowRight,
  ImagePlus,
  X,
} from "lucide-react";
import type { Cat, Mating, Litter, HealthRecord, Profile } from "@/lib/db";
import { signUrl, daysBetween, CAT_BREEDS, REGISTRATION_BODIES } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cattery/")({
  head: () => ({ meta: [{ title: "Cattery Manager — My Cattery" }] }),
  component: Cattery,
});

function Cattery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cats").select("*").is("archived_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cat[];
    },
  });

  const matings = useQuery({
    queryKey: ["matings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matings").select("*").order("mating_date", { ascending: false });
      if (error) throw error;
      return data as Mating[];
    },
  });

  const litters = useQuery({
    queryKey: ["litters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("litters").select("*").order("dob", { ascending: false }).limit(5);
      if (error) throw error;
      return data as Litter[];
    },
  });

  const healthRecords = useQuery({
    queryKey: ["health_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("health_records").select("*").order("test_date", { ascending: false });
      if (error) throw error;
      return data as HealthRecord[];
    },
  });

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (error && error.code !== "PGRST116") throw error;
      return (data as Profile) ?? null;
    },
    enabled: !!user,
  });

  const saveProfile = useMutation({
    mutationFn: async (values: { catteryName: string; breed: string; multipleBreeds: boolean; registrationBody: string; registrationNumber: string; logoUrl: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          cattery_name: values.catteryName,
          breed: values.breed || null,
          multiple_breeds: values.multipleBreeds,
          registration_body: values.registrationBody || null,
          registration_number: values.registrationNumber || null,
          logo_url: values.logoUrl || null,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const activePregs = (matings.data ?? []).filter((m) => m.status === "active");
  const now = new Date();
  const upcoming = activePregs
    .map((m) => {
      const due = new Date(m.mating_date);
      due.setDate(due.getDate() + 65);
      return { ...m, due, daysLeft: daysBetween(now, due) };
    })
    .filter((m) => m.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const catName = (id: string) => cats.data?.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Cattery Manager</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">My Cattery</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add cat</Button>
          </DialogTrigger>
          <AddCatDialog userId={user!.id} onSaved={() => { queryClient.invalidateQueries({ queryKey: ["cats"] }); setOpen(false); }} />
        </Dialog>
      </header>

      <CatteryNameSection profile={profile.data} userId={user!.id} onSave={(values) => saveProfile.mutate(values)} saving={saveProfile.isPending} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a href="#my-cats" className="block"><StatCard icon={<CatIcon className="h-5 w-5" />} label="Total cats" value={cats.data?.length ?? 0} /></a>
        <Link to="/breeding" className="block"><StatCard icon={<HeartPulse className="h-5 w-5" />} label="Active pregnancies" value={activePregs.length} /></Link>
        <Link to="/breeding" className="block"><StatCard icon={<CalendarClock className="h-5 w-5" />} label="Mating records" value={upcoming.length} /></Link>
        <Link to="/breeding" className="block"><StatCard icon={<Baby className="h-5 w-5" />} label="Litters" value={litters.data?.length ?? 0} /></Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="my-cats" className="font-display text-xl font-semibold scroll-mt-20">My Cats</h2>
            <p className="text-sm text-muted-foreground">All your cats and their latest health testing at a glance.</p>
          </div>
        </div>

        {!cats.data || cats.data.length === 0 ? (
          <Card className="p-12 text-center">
            <CatIcon className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold mt-3">No cats yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first cat to start building your cattery records.</p>
            <Button onClick={() => setOpen(true)}>Add my first cat</Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(cats.data ?? []).map((cat) => (
              <CatCard key={cat.id} cat={cat} records={(healthRecords.data ?? []).filter((r) => r.cat_id === cat.id)} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Mating records</h2>
            <Link to="/breeding" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState text="No mating records. Log a mating from the Breeding page." />
          ) : (
            <ul className="divide-y">
              {upcoming.slice(0, 5).map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{catName(m.queen_id)} <span className="text-muted-foreground">×</span> {catName(m.stud_id)}</div>
                    <div className="text-xs text-muted-foreground">Due {m.due.toLocaleDateString()}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/40 px-3 py-1 text-xs font-medium text-accent-foreground">
                    {m.daysLeft === 0 ? "Today" : `${m.daysLeft}d left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Litters</h2>
            <Link to="/breeding" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {(litters.data?.length ?? 0) === 0 ? (
            <EmptyState text="No litters recorded yet." />
          ) : (
            <ul className="divide-y">
              {litters.data!.map((l) => (
                <li key={l.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {l.queen_id ? catName(l.queen_id) : "Litter"} — {l.kitten_count} kitten{l.kitten_count === 1 ? "" : "s"}
                    </div>
                    <div className="text-xs text-muted-foreground">Born {new Date(l.dob).toLocaleDateString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function CatteryNameSection({
  profile,
  onSave,
  saving,
  userId,
}: {
  profile: Profile | null | undefined;
  onSave: (values: { catteryName: string; breed: string; multipleBreeds: boolean; registrationBody: string; registrationNumber: string; logoUrl: string }) => void;
  saving: boolean;
  userId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [catteryName, setCatteryName] = useState(profile?.cattery_name ?? "");
  const [breed, setBreed] = useState(profile?.breed ?? "");
  const [multipleBreeds, setMultipleBreeds] = useState(profile?.multiple_breeds ?? false);
  const [registrationBody, setRegistrationBody] = useState(profile?.registration_body ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(profile?.registration_number ?? "");
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    setCatteryName(profile?.cattery_name ?? "");
    setBreed(profile?.breed ?? "");
    setMultipleBreeds(profile?.multiple_breeds ?? false);
    setRegistrationBody(profile?.registration_body ?? "");
    setRegistrationNumber(profile?.registration_number ?? "");
    setLogoUrl(profile?.logo_url ?? "");
  }, [profile?.cattery_name, profile?.breed, profile?.multiple_breeds, profile?.registration_body, profile?.registration_number, profile?.logo_url]);

  const hasName = Boolean(profile?.cattery_name);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catteryName.trim()) return;
    onSave({
      catteryName: catteryName.trim(),
      breed,
      multipleBreeds,
      registrationBody: registrationBody.trim(),
      registrationNumber: registrationNumber.trim(),
      logoUrl,
    });
  };

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("cattery-logos").upload(path, file);
      if (upErr) throw upErr;
      setLogoUrl(path);
      toast.success("Registration certificate uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Certificate upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    if (!logoUrl) return;
    try {
      await supabase.storage.from("cattery-logos").remove([logoUrl]);
    } catch {}
    setLogoUrl("");
  }

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  useEffect(() => {
    if (logoUrl) signUrl("cattery-logos", logoUrl).then(setLogoPreview);
    else setLogoPreview(null);
  }, [logoUrl]);

  return (
    <Card className="p-6">
      {!hasName ? (
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-semibold mb-1">Register your cattery</h2>
          <p className="text-sm text-muted-foreground mb-4">Give your cattery a name and tell us what you breed.</p>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="cattery-name">Cattery name</Label>
              <Input
                id="cattery-name"
                placeholder="e.g. Purrfect Persians"
                value={catteryName}
                onChange={(e) => setCatteryName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cattery-breed">Breed</Label>
              <Select value={breed} onValueChange={setBreed}>
                <SelectTrigger id="cattery-breed">
                  <SelectValue placeholder="Select a breed" />
                </SelectTrigger>
                <SelectContent>
                  {CAT_BREEDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="multiple-breeds"
                checked={multipleBreeds}
                onCheckedChange={(checked) => setMultipleBreeds(Boolean(checked))}
              />
              <Label htmlFor="multiple-breeds" className="font-normal">
                I breed more than one breed / kind
              </Label>
            </div>
            <div>
              <Label htmlFor="registration-body">Registered with</Label>
              <Select value={registrationBody} onValueChange={setRegistrationBody}>
                <SelectTrigger id="registration-body">
                  <SelectValue placeholder="Select a registry" />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_BODIES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="registration-number">Cattery registration number</Label>
              <Input
                id="registration-number"
                placeholder="e.g. AB12345"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Registration certificate</Label>
              <div className="mt-2 flex items-center gap-4">
                {logoPreview && (
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden border">
                    <img src={logoPreview} alt="Registration certificate preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-destructive"
                      aria-label="Remove certificate"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
                  <ImagePlus className="h-4 w-4" />
                  <span>{uploadingLogo ? "Uploading…" : "Upload certificate"}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingLogo}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }}
                  />
                </label>
              </div>
            </div>
            <Button type="submit" disabled={!catteryName.trim() || saving}>
              {saving ? "Saving…" : "Register cattery"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cattery</p>
            {editing ? (
              <form className="space-y-4 max-w-md" onSubmit={submit}>
                <div>
                  <Label htmlFor="cattery-name-edit">Cattery name</Label>
                  <Input
                    id="cattery-name-edit"
                    value={catteryName}
                    onChange={(e) => setCatteryName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cattery-breed-edit">Breed</Label>
                  <Select value={breed} onValueChange={setBreed}>
                    <SelectTrigger id="cattery-breed-edit">
                      <SelectValue placeholder="Select a breed" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAT_BREEDS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multiple-breeds-edit"
                    checked={multipleBreeds}
                    onCheckedChange={(checked) => setMultipleBreeds(Boolean(checked))}
                  />
                  <Label htmlFor="multiple-breeds-edit" className="font-normal">
                    I breed more than one breed / kind
                  </Label>
                </div>
                <div>
                  <Label htmlFor="registration-body-edit">Registered with</Label>
                  <Select value={registrationBody} onValueChange={setRegistrationBody}>
                    <SelectTrigger id="registration-body-edit">
                      <SelectValue placeholder="Select a registry" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGISTRATION_BODIES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="registration-number-edit">Cattery registration number</Label>
                  <Input
                    id="registration-number-edit"
                    placeholder="e.g. AB12345"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Registration certificate</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {logoPreview && (
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden border">
                        <img src={logoPreview} alt="Registration certificate preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-destructive"
                          aria-label="Remove certificate"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
                      <ImagePlus className="h-4 w-4" />
                      <span>{uploadingLogo ? "Uploading…" : "Upload certificate"}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingLogo}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={!catteryName.trim() || saving}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold">{profile?.cattery_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {profile?.breed ? profile.breed : "No breed selected"}
                  {profile?.multiple_breeds ? " — multiple breeds" : ""}
                </p>
                {(profile?.registration_body || profile?.registration_number) && (
                  <p className="text-sm text-muted-foreground">
                    {profile?.registration_body && <span className="font-medium text-foreground">{profile.registration_body}</span>}
                    {profile?.registration_body && profile?.registration_number && " · "}
                    {profile?.registration_number}
                  </p>
                )}
                {logoPreview && (
                  <a
                    href={logoPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View registration certificate
                  </a>
                )}
              </>
            )}
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function CatCard({ cat, records }: { cat: Cat; records: HealthRecord[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const latest = records.slice(0, 3);

  useEffect(() => {
    if (cat.photo_url) signUrl("cat-photos", cat.photo_url).then(setUrl);
  }, [cat.photo_url]);

  async function uploadPhoto(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const previousPath = cat.photo_url;
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("cat-photos").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("cats").update({ photo_url: path }).eq("id", cat.id);
      if (error) throw error;
      if (previousPath) {
        try { await supabase.storage.from("cat-photos").remove([previousPath]); } catch {}
      }
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["cats"] });
      qc.invalidateQueries({ queryKey: ["cat", cat.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full transition hover:shadow-lg hover:-translate-y-0.5">
      <div className="aspect-square border-[3px] border-[#C8102E] rounded-lg overflow-hidden bg-secondary relative overflow-hidden group">
        <Link to="/cattery/$catId" params={{ catId: cat.id }} className="absolute inset-0">
          {url ? (
            <img src={url} alt={cat.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground">
              <CatIcon className="h-12 w-12" />
            </div>
          )}
        </Link>
        <span className="absolute top-3 right-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-0.5 text-xs font-medium z-10">
          {cat.gender}
        </span>
        <label className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent z-10 cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background transition">
            <ImagePlus className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : url ? "Change photo" : "Add photo"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }}
          />
        </label>
      </div>
      <Link to="/cattery/$catId" params={{ catId: cat.id }} className="flex flex-col flex-1 p-4 group">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold truncate">{cat.name}</div>
            <div className="text-sm text-muted-foreground truncate">{cat.breed || "—"} · {catAge(cat.dob)}</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
        </div>

        <div className="mt-4 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Health & testing</span>
          </div>
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health records yet.</p>
          ) : (
            <ul className="space-y-2">
              {latest.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.record_type}{r.title ? ` — ${r.title}` : ""}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {r.test_date ? new Date(r.test_date).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Pending"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground py-8 text-center">{text}</div>;
}

function catAge(dob: string | null) {
  if (!dob) return "Age unknown";
  const birth = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 0) return "Age unknown";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} yr${years === 1 ? "" : "s"}`;
  return `${years} yr${years === 1 ? "" : "s"} ${rem} mo`;
}

function AddCatDialog({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState<"Stud" | "Queen" | "Alter">("Queen");
  const [dob, setDob] = useState("");
  const [reg, setReg] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pedigree, setPedigree] = useState<File | null>(null);
  const [pedigreePreview, setPedigreePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
  }

  function pickPedigree(file: File | undefined) {
    if (!file) return;
    setPedigree(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPedigreePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPedigreePreview(null);
    }
  }

  function removePedigree() {
    setPedigree(null);
    setPedigreePreview(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let photo_url: string | null = null;
      if (photo) {
        const path = `${userId}/${crypto.randomUUID()}-${photo.name}`;
        const { error: upErr } = await supabase.storage.from("cat-photos").upload(path, photo);
        if (upErr) throw upErr;
        photo_url = path;
      }
      let pedigree_url: string | null = null;
      if (pedigree) {
        const path = `${userId}/pedigrees/${crypto.randomUUID()}-${pedigree.name}`;
        const { error: upErr } = await supabase.storage.from("health-docs").upload(path, pedigree);
        if (upErr) throw upErr;
        pedigree_url = path;
      }
      const { error } = await supabase.from("cats").insert({
        user_id: userId, name, breed: breed || null, gender,
        dob: dob || null, registration_number: reg || null, photo_url, pedigree_url,
      });
      if (error) throw error;
      toast.success(`${name} added to your cattery`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add cat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="font-display">Add a cat</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Breed</Label><Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Maine Coon" /></div>
          <div>
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as "Stud" | "Queen" | "Alter")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Queen">Queen</SelectItem>
                <SelectItem value="Stud">Stud</SelectItem>
                <SelectItem value="Alter">Alter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date of birth</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          <div><Label>Registration #</Label><Input value={reg} onChange={(e) => setReg(e.target.value)} /></div>
          <div className="col-span-2">
            <Label>Photo</Label>
            <div className="mt-1.5 flex items-center gap-4">
              {photoPreview ? (
                <div className="relative h-24 w-24 rounded-lg overflow-hidden border">
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-destructive"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg border border-dashed border-border bg-secondary/30 grid place-items-center text-muted-foreground">
                  <CatIcon className="h-8 w-8" />
                </div>
              )}
              <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
                <ImagePlus className="h-4 w-4" />
                <span>Upload photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={busy}
                  onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
          <div className="col-span-2">
            <Label>Pedigree Certificate / Document</Label>
            <p className="text-xs text-muted-foreground mt-1">Upload a photo or scan of your cat's pedigree certificate (if applicable).</p>
            <div className="mt-2 flex items-center gap-4">
              {pedigree ? (
                <div className="relative h-24 w-24 rounded-lg overflow-hidden border bg-secondary/30 grid place-items-center">
                  {pedigreePreview ? (
                    <img src={pedigreePreview} alt="Pedigree preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-1 text-muted-foreground">
                      <FileText className="h-6 w-6" />
                      <span className="text-[10px] truncate max-w-[80px]">{pedigree.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={removePedigree}
                    className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-destructive"
                    aria-label="Remove pedigree"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg border border-dashed border-border bg-secondary/30 grid place-items-center text-muted-foreground">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
                <ImagePlus className="h-4 w-4" />
                <span>Upload pedigree</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={busy}
                  onChange={(e) => { pickPedigree(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add cat"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cat as CatIcon, ArrowLeft, FileText, Upload, Trash2, ImagePlus, X, Pencil, Archive, ArchiveRestore } from "lucide-react";
import type { Cat, HealthRecord } from "@/lib/db";
import { signUrl } from "@/lib/db";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";

export const Route = createFileRoute("/_authenticated/cattery/$catId")({
  head: () => ({ meta: [{ title: "Cat profile — Cattery Manager" }] }),
  component: CatDetail,
});

const RECORD_TYPES = ["HCM Echo", "Hip Dysplasia", "DNA Panel", "Other"] as const;

function CatDetail() {
  const { catId } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pedigreeUrl, setPedigreeUrl] = useState<string | null>(null);
  const [uploadingPedigree, setUploadingPedigree] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [form, setForm] = useState({ name: "", gender: "", breed: "", dob: "", registration_number: "" });

  const { data: cat, refetch } = useQuery({
    queryKey: ["cat", catId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cats").select("*").eq("id", catId).maybeSingle();
      if (error) throw error;
      return data as Cat | null;
    },
  });

  const { data: records } = useQuery({
    queryKey: ["health", catId],
    queryFn: async () => {
      const { data, error } = await supabase.from("health_records").select("*").eq("cat_id", catId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as HealthRecord[];
    },
  });

  useEffect(() => {
    if (cat?.photo_url) signUrl("cat-photos", cat.photo_url).then(setPhotoUrl);
    else setPhotoUrl(null);
  }, [cat?.photo_url]);

  useEffect(() => {
    if (cat?.pedigree_url) signUrl("health-docs", cat.pedigree_url).then(setPedigreeUrl);
    else setPedigreeUrl(null);
  }, [cat?.pedigree_url]);

  async function changePhoto(file: File) {
    if (!user || !cat) return;
    setUploadingPhoto(true);
    try {
      const previousPath = cat.photo_url;
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("cat-photos").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("cats").update({ photo_url: path }).eq("id", catId);
      if (error) throw error;
      if (previousPath) {
        try { await supabase.storage.from("cat-photos").remove([previousPath]); } catch {}
      }
      toast.success("Photo updated");
      refetch();
      qc.invalidateQueries({ queryKey: ["cats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo update failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    if (!cat || !cat.photo_url) return;
    if (!confirm("Remove this cat's photo?")) return;
    try {
      await supabase.storage.from("cat-photos").remove([cat.photo_url]);
      const { error } = await supabase.from("cats").update({ photo_url: null }).eq("id", catId);
      if (error) throw error;
      toast.success("Photo removed");
      refetch();
      qc.invalidateQueries({ queryKey: ["cats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove photo");
    }
  }

  async function changePedigree(file: File) {
    if (!user || !cat) return;
    setUploadingPedigree(true);
    try {
      const previousPath = cat.pedigree_url;
      const path = `${user.id}/pedigrees/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("health-docs").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("cats").update({ pedigree_url: path }).eq("id", catId);
      if (error) throw error;
      if (previousPath) {
        try { await supabase.storage.from("health-docs").remove([previousPath]); } catch {}
      }
      toast.success("Pedigree certificate updated");
      refetch();
      qc.invalidateQueries({ queryKey: ["cats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pedigree update failed");
    } finally {
      setUploadingPedigree(false);
    }
  }

  async function removePedigree() {
    if (!cat || !cat.pedigree_url) return;
    if (!confirm("Remove this cat's pedigree certificate?")) return;
    try {
      await supabase.storage.from("health-docs").remove([cat.pedigree_url]);
      const { error } = await supabase.from("cats").update({ pedigree_url: null }).eq("id", catId);
      if (error) throw error;
      toast.success("Pedigree certificate removed");
      refetch();
      qc.invalidateQueries({ queryKey: ["cats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove pedigree certificate");
    }
  }

  async function openPedigree() {
    if (!cat?.pedigree_url) return;
    const url = await signUrl("health-docs", cat.pedigree_url, 120);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function startEdit() {
    if (!cat) return;
    setForm({
      name: cat.name ?? "",
      gender: (cat as { gender?: string | null }).gender ?? "",
      breed: cat.breed ?? "",
      dob: cat.dob ? String(cat.dob).slice(0, 10) : "",
      registration_number: cat.registration_number ?? "",
    });
    setEditing(true);
  }

  async function saveCat() {
    if (!form.name.trim()) { toast.error("A name is required"); return; }
    setSavingCat(true);
    try {
      const { error } = await supabase.from("cats").update({
        name: form.name.trim(),
        gender: form.gender.trim() || null,
        breed: form.breed.trim() || null,
        dob: form.dob || null,
        registration_number: form.registration_number.trim() || null,
      }).eq("id", catId);
      if (error) throw error;
      toast.success("Details saved");
      setEditing(false);
      refetch();
      qc.invalidateQueries({ queryKey: ["cats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingCat(false);
    }
  }

  async function setArchived(archive: boolean) {
    if (!cat) return;
    if (archive && !confirm(`Archive ${cat.name}? Their records stay intact — they just move out of your active list.`)) return;
    try {
      const { error } = await supabase.from("cats")
        .update({ archived_at: archive ? new Date().toISOString() : null }).eq("id", catId);
      if (error) throw error;
      toast.success(archive ? `${cat.name} archived` : `${cat.name} is active again`);
      refetch();
      qc.invalidateQueries({ queryKey: ["cats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function deleteCat() {
    if (!cat) return;
    const [litters, matings, health] = await Promise.all([
      supabase.from("litters").select("id", { count: "exact", head: true }).or(`queen_id.eq.${catId},stud_id.eq.${catId}`),
      supabase.from("matings").select("id", { count: "exact", head: true }).or(`queen_id.eq.${catId},stud_id.eq.${catId}`),
      supabase.from("health_records").select("id", { count: "exact", head: true }).eq("cat_id", catId),
    ]);
    const linked = (litters.count ?? 0) + (matings.count ?? 0) + (health.count ?? 0);
    if (linked > 0) {
      toast.error(
        `${cat.name} has ${litters.count ?? 0} litter(s), ${matings.count ?? 0} mating(s) and ${health.count ?? 0} health record(s). Archive instead — deleting would take that history with them.`,
      );
      return;
    }
    if (!confirm(`Permanently delete ${cat.name}? This cannot be undone.`)) return;
    try {
      if (cat.photo_url) { try { await supabase.storage.from("cat-photos").remove([cat.photo_url]); } catch {} }
      if (cat.pedigree_url) { try { await supabase.storage.from("health-docs").remove([cat.pedigree_url]); } catch {} }
      const { error } = await supabase.from("cats").delete().eq("id", catId);
      if (error) throw error;
      toast.success(`${cat.name} deleted`);
      qc.invalidateQueries({ queryKey: ["cats"] });
      window.location.href = "/cattery";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  if (!cat) {
    return <div className="text-center text-muted-foreground py-12">Loading…</div>;
  }

  const archivedAt = (cat as { archived_at?: string | null }).archived_at ?? null;

  async function deleteRecord(r: HealthRecord) {
    if (!confirm("Delete this record?")) return;
    await supabase.storage.from("health-docs").remove([r.file_url]);
    await supabase.from("health_records").delete().eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["health", catId] });
    toast.success("Record deleted");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/cattery" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to cattery
      </Link>

      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-[260px_1fr]">
          <div className="h-80 sm:h-[26rem] bg-secondary relative group border-[3px] border-[#C8102E] rounded-lg overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={cat.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground"><CatIcon className="h-16 w-16" /></div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent opacity-100 transition">
              <label className="relative inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background cursor-pointer transition">
                <ImagePlus className="h-3.5 w-3.5" />
                <span>{uploadingPhoto ? "Uploading…" : "Change photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingPhoto}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) changePhoto(f); e.target.value = ""; }}
                />
              </label>
              {cat.photo_url && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background transition"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            {archivedAt && (
              <div className="rounded-md border-l-4 border-l-[#C9791A] bg-[#FBF6EE] px-3 py-2 text-sm">
                Archived on {new Date(archivedAt).toLocaleDateString()} — kept for your records, hidden from the active list.
              </div>
            )}

            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cat-name">Name</Label>
                  <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cat-gender">Sex</Label>
                    <Input id="cat-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Queen / Stud / Alter" />
                  </div>
                  <div>
                    <Label htmlFor="cat-breed">Breed</Label>
                    <Input id="cat-breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cat-dob">Date of birth</Label>
                    <Input id="cat-dob" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="cat-reg">Registration</Label>
                    <Input id="cat-reg" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={saveCat} disabled={savingCat}>{savingCat ? "Saving…" : "Save"}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={savingCat}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{cat.gender}</div>
                    <h1 className="font-display text-3xl font-semibold mt-1">{cat.name}</h1>
                    <div className="text-muted-foreground">{cat.breed || "—"}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={startEdit} className="shrink-0">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm min-w-0">
                  <div><dt className="text-muted-foreground">Date of birth</dt><dd className="font-medium">{cat.dob ? new Date(cat.dob).toLocaleDateString() : "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Registration</dt><dd className="font-medium break-all">{cat.registration_number || "—"}</dd></div>
                </dl>
              </>
            )}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Pedigree certificate</div>
              <div className="flex flex-wrap items-center gap-3">
                {cat.pedigree_url ? (
                  <>
                    {isImageFile(cat.pedigree_url) && pedigreeUrl ? (
                      <button onClick={openPedigree} className="shrink-0">
                        <img src={pedigreeUrl} alt="Pedigree preview" className="h-20 w-20 rounded-lg object-cover border" />
                      </button>
                    ) : (
                      <button onClick={openPedigree} className="shrink-0 h-20 w-20 rounded-lg border bg-secondary/30 grid place-items-center text-muted-foreground">
                        <FileText className="h-8 w-8" />
                      </button>
                    )}
                    <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                      <button onClick={openPedigree} className="text-sm font-medium hover:underline truncate">View pedigree certificate</button>
                    </div>
                    <ShareButton url={pedigreeUrl ?? ""} filename={cat.name + "-pedigree"} label="Share pedigree" className="bg-[#39FF14] text-[#0B2D05] border-0 hover:bg-[#2FE010]" />
                    <button
                      type="button"
                      onClick={removePedigree}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition"
                      aria-label="Remove pedigree certificate"
                    >
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  </>
                ) : (
                  <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
                    <Upload className="h-4 w-4" />
                    <span>{uploadingPedigree ? "Uploading…" : "Upload pedigree certificate"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingPedigree}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) changePedigree(f); e.target.value = ""; }}
                    />
                  </label>
                )}
              </div>
            </div>

            {!editing && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <ShareButton url={photoUrl ?? ""} filename={cat.name} label="Share photo" className="bg-[#39FF14] text-[#0B2D05] border-0 hover:bg-[#2FE010]" />
                {archivedAt ? (
                  <Button variant="outline" size="sm" onClick={() => setArchived(false)}>
                    <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" /> Restore to active
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setArchived(true)}>
                    <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={deleteCat} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div>
        <div className="flex items-center gap-3 mb-4">
          {photoUrl ? (
            <img src={photoUrl} alt={cat.name} className="h-12 w-12 rounded-full object-cover border" />
          ) : (
            <div className="h-12 w-12 rounded-full border bg-secondary grid place-items-center text-muted-foreground">
              <CatIcon className="h-6 w-6" />
            </div>
          )}
          <h2 className="font-display text-2xl font-semibold">Health records</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {RECORD_TYPES.map((type) => (
            <HealthCard
              key={type}
              type={type}
              records={(records ?? []).filter((r) => r.record_type === type)}
              userId={user!.id}
              catId={catId}
              onChange={() => qc.invalidateQueries({ queryKey: ["health", catId] })}
              onDelete={deleteRecord}
            />
          ))}
        </div>

        <div className="mt-6">
          <HealthCard
            type="Vaccination Booklet"
            helperText="Upload a photo of your kitten's vaccination booklet from your previous vet."
            accept="image/*"
            records={(records ?? []).filter((r) => r.record_type === "Vaccination Booklet")}
            userId={user!.id}
            catId={catId}
            onChange={() => qc.invalidateQueries({ queryKey: ["health", catId] })}
            onDelete={deleteRecord}
          />
        </div>
      </div>
    </div>
  );
}

function HealthCard({
  type, helperText, accept = "image/*,application/pdf", records, userId, catId, onChange, onDelete,
}: {
  type: string;
  helperText?: string;
  accept?: string;
  records: HealthRecord[];
  userId: string;
  catId: string;
  onChange: () => void;
  onDelete: (r: HealthRecord) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");

  async function upload(file: File) {
    setBusy(true);
    try {
      const path = `${userId}/${catId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("health-docs").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("health_records").insert({
        user_id: userId, cat_id: catId, record_type: type,
        title: title || null, file_url: path, file_name: file.name,
      });
      if (error) throw error;
      setTitle("");
      toast.success(`${type} record uploaded`);
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{type}</h3>
          {helperText ? (
            <p className="text-xs text-muted-foreground mt-0.5">{helperText}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{records.length} file{records.length === 1 ? "" : "s"}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {records.map((r) => <RecordRow key={r.id} record={r} onDelete={onDelete} />)}
      </div>

      <div className="mt-4 space-y-2">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
          <Upload className="h-4 w-4" />
          <span>{busy ? "Uploading…" : accept.includes("pdf") ? "Upload image or PDF" : "Upload image"}</span>
          <input
            type="file" accept={accept} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
        </label>
      </div>
    </Card>
  );
}

function isImageFile(name: string | null) {
  if (!name) return false;
  return /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(name);
}

function RecordRow({ record, onDelete }: { record: HealthRecord; onDelete: (r: HealthRecord) => void }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const isImage = isImageFile(record.file_name || record.title);

  useEffect(() => {
    if (isImage) signUrl("health-docs", record.file_url, 120).then(setThumbUrl);
  }, [isImage, record.file_url]);

  async function open() {
    const url = await signUrl("health-docs", record.file_url, 120);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-sm">
      {isImage && thumbUrl ? (
        <button onClick={open} className="shrink-0">
          <img src={thumbUrl} alt="" className="h-8 w-8 rounded object-cover" />
        </button>
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <button onClick={open} className="min-w-0 truncate text-left hover:underline flex-1">
        {record.title || record.file_name || "Document"}
      </button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(record)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

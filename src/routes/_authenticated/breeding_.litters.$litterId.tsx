import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, FileText, Baby } from "lucide-react";
import type { Cat, Litter, Kitten } from "@/lib/db";
import { signUrl } from "@/lib/db";
import { toast } from "sonner";
import { BirthLog } from "@/components/BirthLog";

export const Route = createFileRoute("/_authenticated/breeding_/litters/$litterId")({
  head: () => ({ meta: [{ title: "Litter — Cattery Manager" }] }),
  component: LitterDetail,
});

function LitterDetail() {
  const { litterId } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const { data: litter } = useQuery({
    queryKey: ["litter", litterId],
    queryFn: async () => {
      const { data, error } = await supabase.from("litters").select("*").eq("id", litterId).maybeSingle();
      if (error) throw error;
      return data as Litter | null;
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("cats").select("*")).data as Cat[],
  });

  const { data: kittens } = useQuery({
    queryKey: ["kittens", litterId],
    queryFn: async () => {
      const { data, error } = await supabase.from("kittens").select("*").eq("litter_id", litterId).order("created_at");
      if (error) throw error;
      return data as Kitten[];
    },
  });

  const catName = (id: string | null) => cats?.find((c) => c.id === id)?.name ?? "—";

  if (!litter) {
    return <div className="text-center text-muted-foreground py-12">Loading…</div>;
  }

  const soldCount = (kittens ?? []).filter((k) => k.sold).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/breeding" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to breeding
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Litter</p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-1">
              {catName(litter.queen_id)} × {catName(litter.stud_id)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Born {new Date(litter.dob).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{litter.kitten_count} kitten{litter.kitten_count === 1 ? "" : "s"}</Badge>
            {litter.males_count > 0 && <Badge variant="secondary">♂ {litter.males_count}</Badge>}
            {litter.females_count > 0 && <Badge variant="secondary">♀ {litter.females_count}</Badge>}
            {soldCount > 0 && <Badge>{soldCount} sold</Badge>}
          </div>
        </div>
        {litter.notes && (
          <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">{litter.notes}</p>
        )}
      </Card>

      <BirthLog litterId={litterId} userId={user!.id} />
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Kittens</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add kitten</Button>
          </DialogTrigger>
          <KittenDialog
            userId={user!.id}
            litterId={litterId}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["kittens", litterId] });
              setAddOpen(false);
            }}
          />
        </Dialog>
      </div>

      {(kittens ?? []).length === 0 ? (
        <Card className="p-12 text-center">
          <Baby className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold mt-3">No kittens added yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add each kitten with registration, owner info, and contract.
          </p>
          <Button onClick={() => setAddOpen(true)}>Add first kitten</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {kittens!.map((k) => (
            <KittenCard
              key={k.id}
              kitten={k}
              userId={user!.id}
              litterId={litterId}
              onChanged={() => qc.invalidateQueries({ queryKey: ["kittens", litterId] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KittenCard({
  kitten, userId, litterId, onChanged,
}: {
  kitten: Kitten;
  userId: string;
  litterId: string;
  onChanged: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  async function remove() {
    if (!confirm(`Delete ${kitten.name || "this kitten"}?`)) return;
    if (kitten.contract_url) {
      try { await supabase.storage.from("kitten-contracts").remove([kitten.contract_url]); } catch {}
    }
    const { error } = await supabase.from("kittens").delete().eq("id", kitten.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Kitten deleted");
    onChanged();
  }

  async function openContract() {
    if (!kitten.contract_url) return;
    const url = await signUrl("kitten-contracts", kitten.contract_url, 120);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold truncate">{kitten.name || "Unnamed kitten"}</h3>
            {kitten.gender && (
              <Badge variant="secondary" className="text-xs">
                {kitten.gender === "Male" ? "♂" : kitten.gender === "Female" ? "♀" : kitten.gender}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {kitten.color || "—"}
            {kitten.registration_number ? ` · ${kitten.registration_number}` : ""}
          </p>
          {kitten.sale_rights && (
            <Badge variant="outline" className="mt-2 text-xs">{kitten.sale_rights}</Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <KittenDialog
              userId={userId}
              litterId={litterId}
              existing={kitten}
              onSaved={() => { onChanged(); setEditOpen(false); }}
            />
          </Dialog>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {kitten.sold ? (
        <div className="mt-4 rounded-md border bg-secondary/30 p-3 space-y-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <Badge>Sold</Badge>
            {kitten.sale_date && (
              <span className="text-xs text-muted-foreground">{new Date(kitten.sale_date).toLocaleDateString()}</span>
            )}
          </div>
          {kitten.owner_name && <div className="font-medium">{kitten.owner_name}</div>}
          {kitten.owner_email && <div className="text-muted-foreground">{kitten.owner_email}</div>}
          {kitten.owner_phone && <div className="text-muted-foreground">{kitten.owner_phone}</div>}
          {kitten.owner_address && <div className="text-muted-foreground whitespace-pre-wrap">{kitten.owner_address}</div>}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Available</p>
      )}

      {kitten.contract_url && (
        <button
          onClick={openContract}
          className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <FileText className="h-4 w-4" />
          {kitten.contract_file_name || "View contract"}
        </button>
      )}

      {kitten.notes && (
        <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{kitten.notes}</p>
      )}
    </Card>
  );
}

function KittenDialog({
  userId, litterId, existing, onSaved,
}: {
  userId: string;
  litterId: string;
  existing?: Kitten;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [gender, setGender] = useState(existing?.gender ?? "");
  const [color, setColor] = useState(existing?.color ?? "");
  const [regNumber, setRegNumber] = useState(existing?.registration_number ?? "");
  const [sold, setSold] = useState(existing?.sold ?? false);
  const [ownerName, setOwnerName] = useState(existing?.owner_name ?? "");
  const [ownerEmail, setOwnerEmail] = useState(existing?.owner_email ?? "");
  const [ownerPhone, setOwnerPhone] = useState(existing?.owner_phone ?? "");
  const [ownerAddress, setOwnerAddress] = useState(existing?.owner_address ?? "");
  const [saleDate, setSaleDate] = useState(existing?.sale_date ?? "");
  const [salePrice, setSalePrice] = useState(existing?.sale_price?.toString() ?? "");
  const [saleRights, setSaleRights] = useState(existing?.sale_rights ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [contractUrl, setContractUrl] = useState(existing?.contract_url ?? "");
  const [contractName, setContractName] = useState(existing?.contract_file_name ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadContract(file: File) {
    setUploading(true);
    try {
      const path = `${userId}/${litterId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("kitten-contracts").upload(path, file);
      if (error) throw error;
      if (contractUrl) {
        try { await supabase.storage.from("kitten-contracts").remove([contractUrl]); } catch {}
      }
      setContractUrl(path);
      setContractName(file.name);
      toast.success("Contract uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      user_id: userId,
      litter_id: litterId,
      name: name.trim() || null,
      gender: gender || null,
      color: color.trim() || null,
      registration_number: regNumber.trim() || null,
      sold,
      owner_name: sold ? (ownerName.trim() || null) : null,
      owner_email: sold ? (ownerEmail.trim() || null) : null,
      owner_phone: sold ? (ownerPhone.trim() || null) : null,
      owner_address: sold ? (ownerAddress.trim() || null) : null,
      sale_date: sold && saleDate ? saleDate : null,
      sale_price: sold && salePrice ? Number(salePrice) : null,
      contract_url: contractUrl || null,
      contract_file_name: contractName || null,
      sale_rights: saleRights || null,
      notes: notes.trim() || null,
    };

    const { error } = existing
      ? await supabase.from("kittens").update(payload).eq("id", existing.id)
      : await supabase.from("kittens").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Kitten updated" : "Kitten added");
    onSaved();
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">{existing ? "Edit kitten" : "Add kitten"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="k-name">Name</Label>
            <Input id="k-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="k-gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="k-gender"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="k-color">Color / pattern</Label>
            <Input id="k-color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="k-reg">Registration #</Label>
            <Input id="k-reg" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="k-rights">Sale rights</Label>
          <Select value={saleRights} onValueChange={setSaleRights}>
            <SelectTrigger id="k-rights"><SelectValue placeholder="Pet/spay-neuter or breeding rights" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pet / Spay-Neuter">Pet / Spay-Neuter</SelectItem>
              <SelectItem value="Breeding Rights">Breeding Rights</SelectItem>
              <SelectItem value="Show / Breeding">Show / Breeding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="k-sold" checked={sold} onCheckedChange={(c) => setSold(Boolean(c))} />
            <Label htmlFor="k-sold" className="font-normal">Sold to new owner</Label>
          </div>
          {sold && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="k-owner-name">Owner name</Label>
                <Input id="k-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="k-owner-email">Email</Label>
                  <Input id="k-owner-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="k-owner-phone">Phone</Label>
                  <Input id="k-owner-phone" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="k-owner-address">Address</Label>
                <Textarea id="k-owner-address" rows={2} value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="k-sale-date">Sale date</Label>
                  <Input id="k-sale-date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="k-sale-price">Sale price</Label>
                  <Input id="k-sale-price" type="number" min={0} step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>Kitten contract</Label>
          <div className="mt-2 space-y-2">
            {contractUrl && (
              <div className="flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate flex-1">{contractName || "Contract uploaded"}</span>
              </div>
            )}
            <label className="relative flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-3 text-sm text-muted-foreground hover:bg-secondary/50 cursor-pointer transition">
              <Upload className="h-4 w-4" />
              <span>{uploading ? "Uploading…" : contractUrl ? "Replace contract" : "Upload contract (PDF or image)"}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadContract(f); e.target.value = ""; }}
              />
            </label>
          </div>
        </div>

        <div>
          <Label htmlFor="k-notes">Notes</Label>
          <Textarea id="k-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add kitten"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

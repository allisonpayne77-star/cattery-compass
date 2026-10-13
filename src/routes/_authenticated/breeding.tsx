import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, HeartPulse, Cat as CatIcon, ArrowRight, Pencil, Trash2 } from "lucide-react";
import type { Cat, Mating, Litter } from "@/lib/db";
import { daysBetween } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/breeding")({
  head: () => ({ meta: [{ title: "Breeding & Litters — Cattery Manager" }] }),
  component: Breeding,
});

function Breeding() {
  const { data: cats } = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("cats").select("*")).data as Cat[],
  });
  const { data: matings } = useQuery({
    queryKey: ["matings"],
    queryFn: async () => (await supabase.from("matings").select("*").order("mating_date", { ascending: false })).data as Mating[],
  });
  const { data: litters } = useQuery({
    queryKey: ["litters"],
    queryFn: async () => (await supabase.from("litters").select("*").order("dob", { ascending: false })).data as Litter[],
  });

  const queens = (cats ?? []).filter((c) => c.gender === "Queen");
  const studs = (cats ?? []).filter((c) => c.gender === "Stud");
  const catName = (id: string | null) => cats?.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">Breeding & Litters</h1>
        <p className="text-muted-foreground mt-1">Track matings, calculate due dates, and record litters.</p>
      </div>

      <Tabs defaultValue="matings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matings"><HeartPulse className="h-4 w-4 mr-2" />Matings</TabsTrigger>
          <TabsTrigger value="litters"><CatIcon className="h-4 w-4 mr-2" />Litters</TabsTrigger>
        </TabsList>

        <TabsContent value="matings" className="space-y-4">
          <div className="flex justify-end">
            <LogMatingDialog queens={queens} studs={studs} />
          </div>
          {(matings ?? []).length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No matings logged yet. Use "Log mating" above to start.
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matings!.map((m) => <PregnancyCard key={m.id} m={m} catName={catName} queens={queens} studs={studs} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="litters" className="space-y-4">
          <LittersStats litters={litters ?? []} />
          <div className="flex justify-end">
            <RecordLitterDialog queens={queens} studs={studs} matings={matings ?? []} />
          </div>
          {(litters ?? []).length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">No litters recorded yet.</Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 max-w-2xl mx-auto md:max-w-none">
              {litters!.map((l) => (
                <LitterCard key={l.id} l={l} catName={catName} queens={queens} studs={studs} matings={matings ?? []} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PregnancyCard({ m, catName, queens, studs }: { m: Mating; catName: (id: string | null) => string; queens: Cat[]; studs: Cat[] }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [starting, setStarting] = useState(false);
  const existingLitter = useQuery({ queryKey: ["litter-for-mating", m.id], queryFn: async () => { const { data } = await supabase.from("litters").select("id").eq("mating_id", m.id).limit(1).maybeSingle(); return data; } });
  const hasLitter = !!existingLitter.data;
  const [editOpen, setEditOpen] = useState(false);
  const matingStart = new Date(m.mating_date);
  const matingEnd = m.mating_end_date ? new Date(m.mating_end_date) : null;
  const forecastFrom = matingStart;
  const addDays = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
  const earlyDue = addDays(forecastFrom, 61);
  const due = addDays(forecastFrom, 65);
  const lateDue = addDays(forecastFrom, 72); const pinkFrom = addDays(forecastFrom, 21); const pinkTo = addDays(forecastFrom, 28);
  const now = new Date();
  const daysLeft = daysBetween(now, due);
  const pct = Math.max(0, Math.min(100, ((65 - daysLeft) / 65) * 100));
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  async function startLog() { if (starting) return; setStarting(true); const ex = await supabase.from("litters").select("id").eq("mating_id", m.id).limit(1).maybeSingle(); if (ex.data) { setStarting(false); nav({ to: "/breeding/litters/$litterId", params: { litterId: ex.data.id } }); return; } const { data, error } = await supabase.from("litters").insert({ user_id: m.user_id, mating_id: m.id, queen_id: m.queen_id, stud_id: m.stud_id, dob: new Date().toISOString().slice(0, 10), kitten_count: 0, males_count: 0, females_count: 0 }).select("id").single(); setStarting(false); if (error) { toast.error(error.message); return; } qc.invalidateQueries({ queryKey: ["litters"] }); nav({ to: "/breeding/litters/$litterId", params: { litterId: data.id } }); }

  async function remove() {
    if (!confirm("Delete this mating record?")) return;
    const { error } = await supabase.from("matings").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mating deleted");
    qc.invalidateQueries({ queryKey: ["matings"] });
  }

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-display text-xl font-semibold truncate">
          {catName(m.queen_id)} <span className="text-muted-foreground font-normal">×</span> {catName(m.stud_id)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
            {m.status}
          </span>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Pencil className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <EditMatingDialog mating={m} queens={queens} studs={studs} onSaved={() => setEditOpen(false)} />
          </Dialog>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Mated {matingStart.toLocaleDateString()}{matingEnd ? ` – ${matingEnd.toLocaleDateString()}` : ""}
      </div>
      <div className="mt-4">
        <div className="mt-3 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs"><div className="text-muted-foreground">Pinking up, days 21 to 28</div><div className="font-medium">{fmt(pinkFrom)} to {fmt(pinkTo)}</div></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-secondary/60 px-2.5 py-1.5">
            <div className="text-muted-foreground">Earliest (61d)</div>
            <div className="font-medium">{fmt(earlyDue)}</div>
          </div>
          <div className="rounded-md bg-secondary/60 px-2.5 py-1.5">
            <div className="text-muted-foreground">Latest (72d)</div>
            <div className="font-medium">{fmt(lateDue)}</div>
          </div>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Est. due date (65 days)</span>
          <span className="font-semibold">{due.toLocaleDateString()}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-right">
          {daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? "Due today!" : `${-daysLeft} days overdue`}
        </div>
      </div>
      <Button className="w-full mt-4 h-12" disabled={starting} onClick={startLog}>{starting ? "Opening" : (hasLitter ? "Continue birth log" : "Start birth log")}</Button>
      {m.notes && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{m.notes}</p>}
    </Card>
  );
}

function LittersStats({ litters }: { litters: Litter[] }) {
  const totalLitters = litters.length;
  const totalKittens = litters.reduce((sum, l) => sum + l.kitten_count, 0);
  const lastDob = litters.length > 0
    ? litters.map((l) => l.dob).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    : null;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-3 text-center">
        <div className="text-xs text-muted-foreground">Litters</div>
        <div className="font-display text-2xl font-semibold">{totalLitters}</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-xs text-muted-foreground">Kittens</div>
        <div className="font-display text-2xl font-semibold">{totalKittens}</div>
      </Card>
      <Card className="p-3 text-center">
        <div className="text-xs text-muted-foreground">Latest birth</div>
        <div className="font-display text-base font-semibold leading-tight">{lastDob ? new Date(lastDob).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
      </Card>
    </div>
  );
}

function LitterCard({
  l, catName, queens, studs, matings,
}: {
  l: Litter;
  catName: (id: string | null) => string;
  queens: Cat[];
  studs: Cat[];
  matings: Mating[];
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  async function remove() {
    if (!confirm("Delete this litter? All kittens and contracts will be removed.")) return;
    const { error } = await supabase.from("litters").delete().eq("id", l.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Litter deleted");
    qc.invalidateQueries({ queryKey: ["litters"] });
  }

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <Link to="/breeding/litters/$litterId" params={{ litterId: l.id }} className="min-w-0 group flex-1">
          <div className="flex items-center gap-2">
            <div className="font-display text-xl font-semibold truncate">
              {catName(l.queen_id)} × {catName(l.stud_id)}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Pencil className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <EditLitterDialog litter={l} queens={queens} studs={studs} matings={matings} onSaved={() => setEditOpen(false)} />
          </Dialog>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Link to="/breeding/litters/$litterId" params={{ litterId: l.id }} className="block"><div className="mt-4 grid grid-cols-2 gap-3 text-base">
        <div className="rounded-md bg-secondary/50 px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Date of birth</div>
          <div className="font-medium">{new Date(l.dob).toLocaleDateString()}</div>
        </div>
        <div className="rounded-md bg-secondary/50 px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Kittens</div>
          <div className="font-medium">
            {l.kitten_count} total
            {(l.males_count > 0 || l.females_count > 0) && (
              <span className="text-muted-foreground font-normal">
                {l.males_count > 0 && ` · ♂ ${l.males_count}`}
                {l.females_count > 0 && ` · ♀ ${l.females_count}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {l.notes && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap line-clamp-2">{l.notes}</p>}<div className="mt-3 text-sm font-medium text-primary">View kittens and details</div></Link>
    </Card>
  );
}

function EditMatingDialog({
  mating, queens, studs, onSaved,
}: {
  mating: Mating;
  queens: Cat[];
  studs: Cat[];
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [queenId, setQueenId] = useState(mating.queen_id);
  const [studId, setStudId] = useState(mating.stud_id);
  const [date, setDate] = useState(mating.mating_date);
  const [endDate, setEndDate] = useState(mating.mating_end_date ?? "");
  const [status, setStatus] = useState(mating.status);
  const [notes, setNotes] = useState(mating.notes ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (endDate && endDate < date) { toast.error("Last mating date can't be before first"); return; }
    const { error } = await supabase.from("matings").update({
      queen_id: queenId, stud_id: studId, mating_date: date, mating_end_date: endDate || null, status, notes: notes || null,
    }).eq("id", mating.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mating updated");
    qc.invalidateQueries({ queryKey: ["matings"] });
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-display">Edit mating</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Queen</Label>
          <Select value={queenId} onValueChange={setQueenId}>
            <SelectTrigger><SelectValue placeholder="Queen" /></SelectTrigger>
            <SelectContent>{queens.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Stud</Label>
          <Select value={studId} onValueChange={setStudId}>
            <SelectTrigger><SelectValue placeholder="Stud" /></SelectTrigger>
            <SelectContent>{studs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First mating date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div><Label>Last mating date</Label><Input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <DialogFooter><Button type="submit">Save changes</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditLitterDialog({
  litter, queens, studs, matings, onSaved,
}: {
  litter: Litter;
  queens: Cat[];
  studs: Cat[];
  matings: Mating[];
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [matingId, setMatingId] = useState(litter.mating_id ?? "");
  const [queenId, setQueenId] = useState(litter.queen_id ?? "");
  const [studId, setStudId] = useState(litter.stud_id ?? "");
  const [dob, setDob] = useState(litter.dob);
  const [males, setMales] = useState(String(litter.males_count));
  const [females, setFemales] = useState(String(litter.females_count));
  const [notes, setNotes] = useState(litter.notes ?? "");

  function pickMating(id: string) {
    setMatingId(id);
    const m = matings.find((x) => x.id === id);
    if (m) { setQueenId(m.queen_id); setStudId(m.stud_id); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = parseInt(males, 10) || 0;
    const f = parseInt(females, 10) || 0;
    const { error } = await supabase.from("litters").update({
      mating_id: matingId || null,
      queen_id: queenId || null,
      stud_id: studId || null,
      dob,
      kitten_count: m + f,
      males_count: m,
      females_count: f,
      notes: notes || null,
    }).eq("id", litter.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Litter updated");
    qc.invalidateQueries({ queryKey: ["litters"] });
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-display">Edit litter</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {matings.length > 0 && (
          <div>
            <Label>Linked mating (optional)</Label>
            <Select value={matingId} onValueChange={pickMating}>
              <SelectTrigger><SelectValue placeholder="Pick a mating" /></SelectTrigger>
              <SelectContent>
                {matings.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {new Date(m.mating_date).toLocaleDateString()} — {queens.find(q => q.id === m.queen_id)?.name ?? "?"} × {studs.find(s => s.id === m.stud_id)?.name ?? "?"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Queen</Label>
            <Select value={queenId} onValueChange={setQueenId}>
              <SelectTrigger><SelectValue placeholder="Queen" /></SelectTrigger>
              <SelectContent>{queens.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stud</Label>
            <Select value={studId} onValueChange={setStudId}>
              <SelectTrigger><SelectValue placeholder="Stud" /></SelectTrigger>
              <SelectContent>{studs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Date of birth</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required /></div>
          <div><Label># of males</Label><Input type="number" min={0} value={males} onChange={(e) => setMales(e.target.value)} required /></div>
          <div><Label># of females</Label><Input type="number" min={0} value={females} onChange={(e) => setFemales(e.target.value)} required /></div>
        </div>
        <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <DialogFooter><Button type="submit">Save changes</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function LogMatingDialog({ queens, studs }: { queens: Cat[]; studs: Cat[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [queenId, setQueenId] = useState("");
  const [studId, setStudId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!queenId || !studId) { toast.error("Pick a queen and a stud"); return; }
    if (endDate && endDate < date) { toast.error("Last mating date can't be before first"); return; }
    const { error } = await supabase.from("matings").insert({
      user_id: user!.id, queen_id: queenId, stud_id: studId, mating_date: date, mating_end_date: endDate || null, notes: notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Mating logged");
    qc.invalidateQueries({ queryKey: ["matings"] });
    setOpen(false); setQueenId(""); setStudId(""); setEndDate(""); setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Log mating</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Log a mating</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Queen</Label>
            <Select value={queenId} onValueChange={setQueenId}>
              <SelectTrigger><SelectValue placeholder="Select queen" /></SelectTrigger>
              <SelectContent>{queens.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stud</Label>
            <Select value={studId} onValueChange={setStudId}>
              <SelectTrigger><SelectValue placeholder="Select stud" /></SelectTrigger>
              <SelectContent>{studs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First mating date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div><Label>Last mating date</Label><Input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <DialogFooter><Button type="submit">Log mating</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordLitterDialog({ queens, studs, matings }: { queens: Cat[]; studs: Cat[]; matings: Mating[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [matingId, setMatingId] = useState<string>("");
  const [queenId, setQueenId] = useState("");
  const [studId, setStudId] = useState("");
  const [dob, setDob] = useState(new Date().toISOString().slice(0, 10));
  const [males, setMales] = useState("0");
  const [females, setFemales] = useState("0");
  const [notes, setNotes] = useState("");

  function pickMating(id: string) {
    setMatingId(id);
    const m = matings.find((x) => x.id === id);
    if (m) { setQueenId(m.queen_id); setStudId(m.stud_id); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!queenId || !studId) { toast.error("Pick a queen and a stud"); return; }
    const m = parseInt(males, 10) || 0;
    const f = parseInt(females, 10) || 0;
    const { error } = await supabase.from("litters").insert({
      user_id: user!.id,
      mating_id: matingId || null,
      queen_id: queenId,
      stud_id: studId,
      dob,
      kitten_count: m + f,
      males_count: m,
      females_count: f,
      notes: notes || null,
    });
    if (error) { toast.error(error.message); return; }
    if (matingId) await supabase.from("matings").update({ status: "completed" }).eq("id", matingId);
    toast.success("Litter recorded");
    qc.invalidateQueries({ queryKey: ["litters"] });
    qc.invalidateQueries({ queryKey: ["matings"] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Record litter</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Record a litter</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-xs text-muted-foreground">Recording an older litter? You can skip the mating link — just pick the queen, stud, and date of birth.</p>
          {matings.length > 0 && (
            <div>
              <Label>Linked mating (optional)</Label>
              <Select value={matingId} onValueChange={pickMating}>
                <SelectTrigger><SelectValue placeholder="Pick a mating (optional)" /></SelectTrigger>
                <SelectContent>
                  {matings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {new Date(m.mating_date).toLocaleDateString()} — {queens.find(q => q.id === m.queen_id)?.name ?? "?"} × {studs.find(s => s.id === m.stud_id)?.name ?? "?"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Queen</Label>
              <Select value={queenId} onValueChange={setQueenId}>
                <SelectTrigger><SelectValue placeholder="Queen" /></SelectTrigger>
                <SelectContent>{queens.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stud</Label>
              <Select value={studId} onValueChange={setStudId}>
                <SelectTrigger><SelectValue placeholder="Stud" /></SelectTrigger>
                <SelectContent>{studs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Date of birth</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required /></div>
            <div><Label># of males</Label><Input type="number" min={0} value={males} onChange={(e) => setMales(e.target.value)} required /></div>
            <div><Label># of females</Label><Input type="number" min={0} value={females} onChange={(e) => setFemales(e.target.value)} required /></div>
          </div>
          <p className="text-xs text-muted-foreground">You can add each kitten's details and contract from the litter page after creating it.</p>
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <DialogFooter><Button type="submit">Record litter</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

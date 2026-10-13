import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type BirthEvent = {
  id: string;
  user_id: string;
  litter_id: string;
  event_type: string;
  occurred_at: string;
  sequence_number: number | null;
  notes: string | null;
};

const EVENTS: { type: string; label: string; counted?: boolean }[] = [
  { type: "kitten_born", label: "Kitten born", counted: true },
  { type: "placenta", label: "Placenta", counted: true },
  { type: "labour_started", label: "Labour started" },
  { type: "first_push", label: "First push" },
  { type: "mucous_plug", label: "Mucous plug" },
];

const LABELS: Record<string, string> = {
  labour_started: "Labour started",
  mucous_plug: "Mucous plug",
  first_push: "First push",
  kitten_born: "Kitten born",
  placenta: "Placenta",
  note: "Note",
};

export function BirthLog({ litterId, userId }: { litterId: string; userId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const { data: events } = useQuery({
    queryKey: ["birth_events", litterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("birth_events")
        .select("*")
        .eq("litter_id", litterId)
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data as BirthEvent[];
    },
  });

  const list = events ?? [];
  const countOf = (t: string) => list.filter((e) => e.event_type === t).length;
  const kittenCount = countOf("kitten_born");
  const placentaCount = countOf("placenta");

  async function log(type: string, counted?: boolean, text?: string) {
    setBusy(true);
    const { error } = await supabase.from("birth_events").insert({
      user_id: userId,
      litter_id: litterId,
      event_type: type,
      occurred_at: new Date().toISOString(),
      sequence_number: counted ? countOf(type) + 1 : null,
      notes: text ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["birth_events", litterId] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("birth_events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["birth_events", litterId] });
  }

  async function saveNote() {
    const text = note.trim();
    if (!text) return;
    await log("note", false, text);
    setNote("");
    setShowNote(false);
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const gapFrom = (i: number) => {
    if (i === 0) return null;
    const mins = Math.round(
      (new Date(list[i].occurred_at).getTime() - new Date(list[i - 1].occurred_at).getTime()) / 60000
    );
    if (mins < 1) return null;
    if (mins < 60) return `+${mins}m`;
    return `+${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-display text-xl font-semibold">Birth log</h2>
        {list.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {kittenCount} kitten{kittenCount === 1 ? "" : "s"} · {placentaCount} placenta
            {placentaCount === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Tap as it happens, in any order. Every entry stamps its own time.
      </p>

      {kittenCount > placentaCount && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-[var(--warning)] bg-secondary/60 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--warning)]" />
          <span>
            {kittenCount - placentaCount} placenta
            {kittenCount - placentaCount === 1 ? "" : "s"} still outstanding.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {EVENTS.map((e) => (
          <Button
            key={e.type}
            variant={e.counted ? "default" : "secondary"}
            className="h-14 text-base"
            disabled={busy}
            onClick={() => log(e.type, e.counted)}
          >
            {e.label}
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-14 text-base"
          disabled={busy}
          onClick={() => setShowNote((s) => !s)}
        >
          Add a note
        </Button>
      </div>

      {showNote && (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={2}
            value={note}
            placeholder="What's happening?"
            onChange={(ev) => setNote(ev.target.value)}
          />
          <Button onClick={saveNote} disabled={busy || !note.trim()}>Save note</Button>
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-5 divide-y divide-border border-t border-border">
          {list.map((e, i) => (
            <div key={e.id} className="flex items-start gap-3 py-2.5">
              <div className="w-16 shrink-0 font-medium tabular-nums">{fmtTime(e.occurred_at)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {LABELS[e.event_type] ?? e.event_type}
                  {e.sequence_number ? ` #${e.sequence_number}` : ""}
                  {gapFrom(i) && (
                    <span className="ml-2 font-normal text-muted-foreground">{gapFrom(i)}</span>
                  )}
                </div>
                {e.notes && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.notes}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(e.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

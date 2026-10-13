import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import {
  runImportBatch,
  getImportCounts,
  checkIsAdmin,
} from "@/lib/admin-import.functions";
import { splitSqlStatements } from "@/lib/sql-split";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: AdminImportPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">Error: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

type LogEntry = { kind: "info" | "ok" | "err"; text: string };

function AdminImportPage() {
  const nav = useNavigate();
  const runBatch = useServerFn(runImportBatch);
  const fetchCounts = useServerFn(getImportCounts);
  const verify = useServerFn(checkIsAdmin);

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [sql, setSql] = useState("");
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    verify()
      .then((r) => {
        if (cancelled) return;
        setAllowed(r.isAdmin);
        if (!r.isAdmin) return;
        fetchCounts().then((c) => !cancelled && setCounts(c)).catch(() => {});
      })
      .catch(() => setAllowed(false))
      .finally(() => !cancelled && setChecking(false));
    return () => { cancelled = true; };
  }, [verify, fetchCounts]);

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const statements = useMemo(() => (sql.trim() ? splitSqlStatements(sql) : []), [sql]);

  function log(entry: LogEntry) {
    setLogs((l) => [...l, entry]);
  }

  async function handleRun() {
    setLogs([]);
    setDone(0);
    const stmts = splitSqlStatements(sql);
    if (!stmts.length) {
      log({ kind: "err", text: "No SQL statements found." });
      return;
    }
    setTotal(stmts.length);
    setRunning(true);
    log({ kind: "info", text: `Parsed ${stmts.length} statement(s). Running…` });

    // Batch in chunks of 25 to keep RPC calls small but reduce round trips.
    const chunkSize = 25;
    let processed = 0;
    try {
      for (let i = 0; i < stmts.length; i += chunkSize) {
        const chunk = stmts.slice(i, i + chunkSize);
        const batchSql = chunk.map((s) => s.replace(/;\s*$/, "")).join(";\n") + ";";
        try {
          await runBatch({ data: { sql: batchSql } });
          processed += chunk.length;
          setDone(processed);
          log({ kind: "ok", text: `Ran statements ${i + 1}–${i + chunk.length}` });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          log({ kind: "err", text: `Batch ${i + 1}–${i + chunk.length} failed: ${msg}` });
          throw e;
        }
      }
      log({ kind: "ok", text: "Import complete." });
    } catch {
      log({ kind: "err", text: "Import stopped due to error." });
    } finally {
      setRunning(false);
      try {
        const c = await fetchCounts();
        setCounts(c);
      } catch { /* ignore */ }
    }
  }

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Admin only
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This page is restricted to administrators.
          </p>
          <Button variant="outline" onClick={() => nav({ to: "/" })}>Back to dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Admin · Import Course Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste the SQL dump from the Course Creator (courses, modules, lessons,
          quiz_questions, survey_questions, survey_responses). Statements run in order with progress below.
        </p>
      </div>

      {counts && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Current row counts</CardTitle></CardHeader>
          <CardContent className="text-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(counts).map(([t, n]) => (
              <div key={t}>
                <div className="text-muted-foreground text-xs">{t}</div>
                <div className="font-medium">{n}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">SQL dump</label>
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="INSERT INTO public.courses (...) VALUES (...);"
          className="min-h-[280px] font-mono text-xs"
          disabled={running}
        />
        <div className="text-xs text-muted-foreground">
          {statements.length} statement(s) detected · {sql.length.toLocaleString()} chars
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleRun} disabled={running || !sql.trim()}>
          {running ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</>) : "Run import"}
        </Button>
        <Button variant="outline" onClick={() => { setSql(""); setLogs([]); setDone(0); setTotal(0); }} disabled={running}>
          Clear
        </Button>
      </div>

      {(running || total > 0) && (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="text-xs text-muted-foreground">
            {done} / {total} statements ({progress}%)
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Log</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm max-h-72 overflow-auto">
              {logs.map((l, i) => (
                <li key={i} className="flex items-start gap-2">
                  {l.kind === "ok" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                  {l.kind === "err" && <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                  {l.kind === "info" && <Loader2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                  <span className={l.kind === "err" ? "text-destructive" : ""}>{l.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

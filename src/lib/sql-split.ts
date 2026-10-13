// Split a SQL script into individual statements, respecting single-quoted
// strings (with '' escaping), double-quoted identifiers, line comments (--),
// block comments (/* */), and dollar-quoted strings ($tag$...$tag$).
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  const n = sql.length;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];

    if (inLineComment) {
      buf += c;
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      buf += c;
      if (c === "*" && c2 === "/") { buf += c2; i += 2; inBlockComment = false; continue; }
      i++;
      continue;
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    if (inSingle) {
      buf += c;
      if (c === "'" && c2 === "'") { buf += c2; i += 2; continue; }
      if (c === "'") inSingle = false;
      i++;
      continue;
    }
    if (inDouble) {
      buf += c;
      if (c === '"') inDouble = false;
      i++;
      continue;
    }
    // not in any string/comment
    if (c === "-" && c2 === "-") { inLineComment = true; buf += c; i++; continue; }
    if (c === "/" && c2 === "*") { inBlockComment = true; buf += c; i++; continue; }
    if (c === "'") { inSingle = true; buf += c; i++; continue; }
    if (c === '"') { inDouble = true; buf += c; i++; continue; }
    if (c === "$") {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (m) {
        dollarTag = m[0];
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    if (c === ";") {
      const trimmed = buf.trim();
      if (trimmed.length) out.push(trimmed);
      buf = "";
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  const tail = buf.trim();
  if (tail.length) out.push(tail);
  return out;
}

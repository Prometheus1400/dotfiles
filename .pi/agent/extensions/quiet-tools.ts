// Quiet tool rows. A segment is the run of tool calls between two pieces of visible text (assistant
// text, a user message, any other transcript entry). While the agent runs, consecutive `live` calls in
// a segment share one line of chips for the calls that have finished, `always` calls (edit, write)
// show their diff, and the call in flight shows in pi's working row in place of "Working".
// Once the agent settles, every segment of that run becomes one line of chips:
//   ▸ 󰏫 src/config.ts +2 -1 · 󰈙 2 󰍉  3 · 󰅖 1 failed · 14.2s
// ctrl+o (or a click) opens a line into one row per call.
//
// Rows are drawn at frame time from a store fed by the tool rows' own render calls (status, args,
// results) and by message events (transcript order and the text between calls). Rows that another row
// draws for them render nothing, which pi's self shell turns into zero lines.
//
// Settings (`quietTools` in settings.json, all optional):
//   lead: "icon" | "dot" | "icon+dot" | "bar"
//   levels: { [toolName]: "always" | "live" | "hidden" | "native" }   ("native" keeps the tool's renderer)
//   diffLines, writeLines: preview caps for edit and write blocks
import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
  ToolRenderers,
} from "@earendil-works/pi-coding-agent";
import { getLanguageFromPath, highlightCode } from "@earendil-works/pi-coding-agent";
import {
  backgroundAnsi,
  type Color,
  type Component,
  Container,
  mixColors,
  sliceByColumn,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import { homedir } from "node:os";

// ── config ──────────────────────────────────────────────────────────────────────────────────────────

type Level = "always" | "live" | "hidden" | "native";
type Lead = "icon" | "dot" | "icon+dot" | "bar";

type Config = {
  readonly lead: Lead;
  readonly levels: Readonly<Record<string, Level>>;
  readonly diffLines: number;
  readonly writeLines: number;
};

const DEFAULT_LEVELS: Readonly<Record<string, Level>> = {
  edit: "always",
  write: "always",
  ask_user_question: "always",
};

const LEADS: readonly Lead[] = ["icon", "dot", "icon+dot", "bar"];
const LEVELS: readonly Level[] = ["always", "live", "hidden", "native"];

const readConfig = (raw: unknown): Config => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const levels: Record<string, Level> = { ...DEFAULT_LEVELS };
  if (o.levels && typeof o.levels === "object") {
    for (const [k, v] of Object.entries(o.levels as Record<string, unknown>)) {
      if (LEVELS.includes(v as Level)) levels[k] = v as Level;
    }
  }
  const num = (v: unknown, d: number): number => (typeof v === "number" && v > 0 ? Math.floor(v) : d);
  return {
    lead: LEADS.includes(o.lead as Lead) ? (o.lead as Lead) : "icon",
    levels,
    diffLines: num(o.diffLines, 20),
    writeLines: num(o.writeLines, 8),
  };
};

let config: Config = readConfig(undefined);
const levelOf = (name: string): Level => config.levels[name] ?? "live";

// ── call store ──────────────────────────────────────────────────────────────────────────────────────

type Status = "pending" | "running" | "ok" | "fail";

type Call = {
  readonly id: string;
  name: string;
  args: Record<string, unknown>;
  status: Status;
  cwd: string;
  startedAt?: number;
  durationMs?: number;
  output: string;
  details?: unknown;
};

const calls = new Map<string, Call>();

const callFor = (id: string, name: string, cwd: string): Call => {
  let c = calls.get(id);
  if (!c) {
    c = { id, name, args: {}, status: "pending", cwd, output: "" };
    calls.set(id, c);
  }
  return c;
};

const textOf = (content: unknown): string =>
  Array.isArray(content)
    ? content
        .filter((b): b is { type: "text"; text: string } => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n")
    : "";

type RenderCtx = {
  args: unknown;
  toolCallId: string;
  cwd: string;
  executionStarted: boolean;
  isPartial: boolean;
  isError: boolean;
  durationMs: number | undefined;
  expanded: boolean;
  outputPad: number;
  invalidate: () => void;
  keyText: (id: string) => string;
};

const noteContext = (name: string, ctx: RenderCtx, result?: { content: unknown; details: unknown }): Call => {
  const c = callFor(ctx.toolCallId, name, ctx.cwd);
  c.name = name;
  if (ctx.args && typeof ctx.args === "object") c.args = ctx.args as Record<string, unknown>;
  if (result) {
    c.output = textOf(result.content);
    c.details = result.details;
  }
  const settled = result !== undefined && !ctx.isPartial;
  if (settled) {
    c.status = ctx.isError ? "fail" : "ok";
    c.durationMs = ctx.durationMs ?? c.durationMs;
  } else if (ctx.executionStarted) {
    if (c.status === "pending" || c.status === "running") c.status = "running";
    c.startedAt ??= Date.now();
  }
  requestRender = ctx.invalidate;
  keyText = ctx.keyText;
  return c;
};

let requestRender: () => void = () => {};
// The TUI itself, reached through a widget factory; `requestRender(true)` redraws from a cleared screen.
let tuiHandle: { requestRender(force?: boolean): void } | undefined;
let keyText: (id: string) => string = () => "";

// Thinking text by the first tool call of the step that thought it.
const thoughts = new Map<string, string>();

type Block = { type?: string; text?: string; thinking?: string; id?: string };

const thoughtOf = (m: MessageLike): { text: string; firstCall: string | undefined } | undefined => {
  if (m.role !== "assistant" || !Array.isArray(m.content)) return undefined;
  const blocks = m.content as Block[];
  const text = blocks
    .filter((b) => b.type === "thinking" && (b.thinking ?? "").trim())
    .map((b) => b.thinking!.trim())
    .join("\n\n");
  return text ? { text, firstCall: blocks.find((b) => b.type === "toolCall")?.id } : undefined;
};

const noteThought = (m: MessageLike): void => {
  const t = thoughtOf(m);
  if (t?.firstCall) thoughts.set(t.firstCall, t.text);
};

// ── transcript order and segments ───────────────────────────────────────────────────────────────────

type Item = { readonly t: "break" } | { readonly t: "call"; readonly id: string; readonly name: string };
type Segment = { readonly ids: readonly string[]; readonly index: number };

const BREAK: Item = { t: "break" };

let committed: Item[] = [];
let streaming: Item[] = [];
let segments: Segment[] = [];
let segmentOf = new Map<string, Segment>();
let signature = "";
// Segments at or after this index belong to the run in progress and are not folded yet.
let liveFrom = Number.POSITIVE_INFINITY;

type MessageLike = { role?: string; content?: unknown };

const itemsOfMessage = (m: MessageLike): Item[] => {
  if (m.role === "toolResult") return [];
  if (m.role !== "assistant") return [BREAK];
  if (!Array.isArray(m.content)) return [];
  const out: Item[] = [];
  for (const b of m.content as { type?: string; text?: string; id?: string; name?: string }[]) {
    if (b.type === "text" && (b.text ?? "").trim()) out.push(BREAK);
    else if (b.type === "toolCall" && b.id && b.name) out.push({ t: "call", id: b.id, name: b.name });
  }
  return out;
};

const rebuild = (): void => {
  const items = [...committed, ...streaming];
  const sig = items.map((i) => (i.t === "call" ? i.id : "|")).join(",");
  if (sig === signature) return;
  signature = sig;
  const segs: Segment[] = [];
  const of = new Map<string, Segment>();
  let cur: string[] | undefined;
  for (const it of items) {
    if (it.t === "break" || levelOf(it.name) === "native") {
      cur = undefined;
      continue;
    }
    if (!cur) {
      cur = [];
      segs.push({ ids: cur, index: segs.length });
    }
    cur.push(it.id);
    of.set(it.id, segs[segs.length - 1]!);
  }
  segments = segs;
  segmentOf = of;
};

const ingestBranch = (ctx: ExtensionContext): void => {
  const items: Item[] = [];
  thoughts.clear();
  for (const e of ctx.sessionManager.getBranch() as { type: string; message?: MessageLike }[]) {
    if (e.type === "message" && e.message) {
      items.push(...itemsOfMessage(e.message));
      noteThought(e.message);
    }
    else if (e.type === "custom_message" || e.type === "compaction" || e.type === "branch_summary") items.push(BREAK);
  }
  committed = items;
  streaming = [];
  signature = "";
  liveFrom = Number.POSITIVE_INFINITY;
  rebuild();
};

// Groups inside a live segment: each `always` call alone, everything else in runs between them.
const liveGroups = (ids: readonly string[]): string[][] => {
  const out: string[][] = [];
  let run: string[] | undefined;
  for (const id of ids) {
    const name = calls.get(id)?.name ?? "";
    if (levelOf(name) === "always") {
      out.push([id]);
      run = undefined;
    } else {
      if (!run) {
        run = [];
        out.push(run);
      }
      run.push(id);
    }
  }
  return out;
};

// ── colors ──────────────────────────────────────────────────────────────────────────────────────────

type Palette = {
  readonly theme: Theme;
  readonly plusBg: string;
  readonly minusBg: string;
  readonly plusEmph: string;
  readonly minusEmph: string;
};

let palette: Palette | undefined;

const paletteFor = (theme: Theme): Palette => {
  if (palette?.theme === theme) return palette;
  const c = theme.colors as Readonly<Record<string, Color>>;
  const base = c.userMessageBg!;
  const mode = theme.getColorMode();
  const tint = (token: string, amount: number): string =>
    backgroundAnsi(mixColors(base, c[token]!, amount, "srgb"), mode);
  palette = {
    theme,
    plusBg: tint("toolDiffAdded", 0.2),
    minusBg: tint("toolDiffRemoved", 0.2),
    plusEmph: tint("toolDiffAdded", 0.35),
    minusEmph: tint("toolDiffRemoved", 0.35),
  };
  return palette;
};

const RESET = "\x1b[0m";

// Keep `bg` under text that resets its own attributes.
const underBg = (s: string, bg: string): string =>
  bg + s.replaceAll("\x1b[0m", `\x1b[0m${bg}`).replaceAll("\x1b[49m", bg);

// ── formatting ──────────────────────────────────────────────────────────────────────────────────────

const ICONS: Readonly<Record<string, string>> = {
  bash: "\ue795",
  read: "\u{f0219}",
  grep: "\u{f0349}",
  find: "\u{f0349}",
  ls: "\u{f024b}",
  edit: "\u{f03eb}",
  write: "\u{f0752}",
  mcp: "\u{f048d}",
  codemode: "\u{f031e}", // md-language_javascript
  subagent: "\u{f06a9}",
  process: "\uf0ae",
  ask_user_question: "\uf059",
  todo: "\uf046",
};
const THINK_ICON = "\u{f09d1}";
const RUN_ICON = "\u{f051b}"; // md-timer_outline
const FALLBACK_ICON = "\uf013";
const FAIL_ICON = "\u{f0156}";

const kindOf = (name: string): string => (name.startsWith("mcp__") ? "mcp" : name);
const iconOf = (name: string): string => ICONS[kindOf(name)] ?? FALLBACK_ICON;

const duration = (ms: number): string => {
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m${String(Math.round(s % 60)).padStart(2, "0")}s`;
};

const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();

const shortPath = (p: string, cwd: string): string => {
  if (p.startsWith(cwd + "/")) return p.slice(cwd.length + 1);
  const home = homedir();
  return p === home ? "~" : p.startsWith(home + "/") ? "~" + p.slice(home.length) : p;
};

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const summarize = (c: Call): string => {
  const a = c.args;
  const path = str(a.path) ?? str(a.file_path);
  switch (kindOf(c.name)) {
    case "bash":
      return oneLine(str(a.command) ?? "");
    case "read": {
      const range = a.offset || a.limit ? `:${a.offset ?? 1}${a.limit ? `+${a.limit}` : ""}` : "";
      return shortPath(path ?? "", c.cwd) + range;
    }
    case "grep":
    case "find":
      return [str(a.pattern), path && shortPath(path, c.cwd)].filter(Boolean).join("  ");
    case "ls":
    case "edit":
    case "write":
      return shortPath(path ?? ".", c.cwd);
    case "codemode": {
      const line = (str(a.code) ?? "").split("\n").find((l) => l.trim() && !l.trim().startsWith("//"));
      return oneLine(line ?? "");
    }
    case "ask_user_question":
      return ((a.questions as { header?: string }[] | undefined) ?? [])
        .map((q) => q?.header)
        .filter(Boolean)
        .join(" · ");
    case "subagent": {
      if (str(a.action)) return `${a.action}${str(a.id) ? ` ${a.id}` : ""}`;
      if (str(a.agent)) return `${a.agent} · ${oneLine(str(a.task) ?? "")}`;
      const tasks = (a.args as { tasks?: unknown[] } | undefined)?.tasks;
      return a.workflow ? `workflow${Array.isArray(tasks) ? ` · ${tasks.length} tasks` : ""}` : "";
    }
    case "mcp": {
      const [, server, ...rest] = c.name.split("__");
      const fields = Object.entries(a)
        .filter(([, v]) => ["string", "number", "boolean"].includes(typeof v))
        .slice(0, 2)
        .map(([k, v]) => `${k}=${oneLine(String(v))}`);
      return [`${server}.${rest.join("__")}`, ...fields].join("  ");
    }
    default:
      return oneLine(
        Object.values(a)
          .filter((v) => typeof v === "string")
          .join(" "),
      );
  }
};

// A failed call's most telling line: the first that looks like an error, else the last.
const errorLine = (s: string): string => {
  const lines = s.split("\n").map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim()).filter(Boolean);
  return oneLine(lines.find((l) => /error|fail|✕|×|exception|denied|not found/i.test(l)) ?? lines.at(-1) ?? "");
};

const exitNote = (c: Call): string | undefined => {
  if (c.status !== "fail" || kindOf(c.name) !== "bash") return undefined;
  const m = c.output.match(/exit(?:ed with)? code:? (\d+)/i);
  return m ? `exit ${m[1]}` : undefined;
};

type DiffLine =
  | { readonly kind: "gap" }
  | { readonly kind: " " | "+" | "-"; readonly n: number; readonly code: string };

const parseDiff = (diff: string): DiffLine[] =>
  diff.split("\n").flatMap((l): DiffLine[] => {
    const m = l.match(/^([ +-])\s*(\d+) (.*)$/);
    if (m) return [{ kind: m[1] as " " | "+" | "-", n: Number(m[2]), code: m[3]! }];
    return l.trim() === "..." ? [{ kind: "gap" }] : [];
  });

const diffStats = (c: Call): { add: number; rem: number } => {
  if (kindOf(c.name) === "write") {
    const content = str(c.args.content) ?? "";
    return { add: content ? content.replace(/\n$/, "").split("\n").length : 0, rem: 0 };
  }
  const diff = str((c.details as { diff?: unknown } | undefined)?.diff) ?? "";
  let add = 0;
  let rem = 0;
  for (const l of parseDiff(diff)) {
    if (l.kind === "+") add++;
    else if (l.kind === "-") rem++;
  }
  return { add, rem };
};

// ── drawing ─────────────────────────────────────────────────────────────────────────────────────────

type Draw = {
  readonly th: Theme;
  readonly width: number;
  readonly pad: string;
};

const sep = (th: Theme): string => th.fg("borderMuted", " · ");

const statusColor = (s: Status): "bashMode" | "success" | "error" =>
  s === "ok" ? "success" : s === "fail" ? "error" : "bashMode";

const leadFor = (th: Theme, c: Call): string => {
  const color = statusColor(c.status);
  switch (config.lead) {
    case "dot":
      return th.fg(color, "⦁");
    case "icon":
      return th.fg(color, iconOf(c.name));
    case "icon+dot":
      return `${th.fg("toolDiffContext", iconOf(c.name))} ${th.fg(color, "⦁")}`;
    case "bar":
      return th.fg(color, "▌");
  }
};

const fit = (d: Draw, line: string): string => truncateToWidth(d.pad + line, d.width, "…");

const elapsed = (c: Call): string | undefined =>
  c.durationMs !== undefined
    ? duration(c.durationMs)
    : c.startedAt !== undefined
      ? duration(Date.now() - c.startedAt)
      : undefined;

const metaOf = (c: Call): string | undefined => exitNote(c);

// A call's summary as drawn: bash commands are syntax highlighted.
const styledSummary = (th: Theme, c: Call, color: "toolOutput" | "toolDiffContext"): string => {
  const text = summarize(c);
  return kindOf(c.name) === "bash" && text ? highlight(text, "bash") : th.fg(color, text);
};

// `left` with `right` flush against the right edge.
const withRight = (d: Draw, left: string, right: string): string => {
  if (!right) return fit(d, left);
  const room = Math.max(10, d.width - visibleWidth(right) - 2);
  const head = truncateToWidth(d.pad + left, room, "…");
  return head + " ".repeat(Math.max(0, room - visibleWidth(head))) + "  " + right;
};

const LINE_COUNTED = new Set(["bash", "read", "grep", "find", "ls", "codemode", "mcp", "process", "subagent"]);

const lineCount = (s: string): number => s.split("\n").filter((l) => l.trim()).length;

// The right column of an opened row: output size, then time taken.
const rightOf = (th: Theme, c: Call): string => {
  const k = kindOf(c.name);
  const size = c.status !== "fail" && LINE_COUNTED.has(k) && c.output ? `${lineCount(c.output)} lines` : "";
  return th.fg("dim", [size, elapsed(c)].filter(Boolean).join(" · "));
};

// One row per call, used inside opened lines.
const callRow = (d: Draw, c: Call, indent: string): string[] => {
  const { th } = d;
  const name = th.bold(th.fg(c.status === "fail" ? "error" : "toolOutput", kindOf(c.name)));
  const args = summarize(c);
  const meta = metaOf(c);
  const head = withRight(
    d,
    `${indent}${leadFor(th, c)} ${name}${args ? `  ${styledSummary(th, c, "toolDiffContext")}` : ""}${meta ? th.fg("error", `  · ${meta}`) : ""}`,
    rightOf(th, c),
  );
  if (c.status !== "fail") return [head];
  const why = errorLine(c.output);
  return why ? [head, fit(d, `${indent}   ${th.fg("toolDiffContext", why)}`)] : [head];
};

// Chip colors by what the call does: look, run, or reach out.
const CHIP_COLORS: Readonly<Record<string, "accent" | "bashMode" | "toolTitle" | "warning">> = {
  read: "accent",
  grep: "accent",
  find: "accent",
  ls: "accent",
  ask_user_question: "accent",
  todo: "accent",
  bash: "bashMode",
  codemode: "warning",
  process: "bashMode",
  mcp: "toolTitle",
  subagent: "toolTitle",
};

const toolChips = (th: Theme, group: readonly Call[]): string[] => {
  const counts = new Map<string, number>();
  for (const c of group) {
    const k = kindOf(c.name);
    if (k === "edit" || k === "write") continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].map(([k, n]) => {
    const color = CHIP_COLORS[k] ?? "toolDiffContext";
    const label = k === "ask_user_question" ? "ask" : k;
    return th.fg(color, `${ICONS[k] ? `${ICONS[k]} ` : ""}${label}`) + (n > 1 ? th.fg("toolOutput", ` ${n}`) : "");
  });
};

// The shortest trailing path that tells each file apart from the others: the basename, unless two
// files in the list share it, then as many parent directories as it takes.
const uniqueSuffixes = (paths: readonly string[]): Map<string, string> => {
  const parts = new Map(paths.map((p) => [p, p.split("/")]));
  const out = new Map<string, string>();
  for (const p of paths) {
    const segs = parts.get(p)!;
    let n = 1;
    const tail = (k: number): string => segs.slice(-k).join("/");
    while (n < segs.length && paths.some((q) => q !== p && tail(n) === parts.get(q)!.slice(-n).join("/"))) n++;
    out.set(p, tail(n));
  }
  return out;
};

const fileChips = (th: Theme, group: readonly Call[]): string[] => {
  const files = new Map<string, { kind: string; add: number; rem: number }>();
  for (const c of group) {
    const k = kindOf(c.name);
    if ((k !== "edit" && k !== "write") || c.status === "fail") continue;
    const path = shortPath(str(c.args.path) ?? str(c.args.file_path) ?? "?", c.cwd);
    const { add, rem } = diffStats(c);
    const f = files.get(path) ?? { kind: k, add: 0, rem: 0 };
    files.set(path, { kind: f.kind, add: f.add + add, rem: f.rem + rem });
  }
  const names = uniqueSuffixes([...files.keys()]);
  return [...files].map(([path, f]) => {
    const glyph = th.fg(f.kind === "edit" ? "bashMode" : "success", ICONS[f.kind]!);
    const stats = th.fg("success", ` +${f.add}`) + (f.rem ? th.fg("error", ` -${f.rem}`) : "");
    return `${glyph} ${th.fg("toolOutput", names.get(path) ?? path)}${stats}`;
  });
};

const summaryLine = (d: Draw, group: readonly Call[], open: boolean): string => {
  const { th } = d;
  const fails = group.filter((c) => c.status === "fail").length;
  const ms = group.reduce((t, c) => t + (c.durationMs ?? 0), 0);
  const tools = toolChips(th, group).join(" ");
  const thinks = group.filter((c) => thoughts.has(c.id)).length;
  const parts = [
    ...(thinks ? [th.fg("thinkingMedium", `${THINK_ICON} ${thinks}`)] : []),
    ...fileChips(th, group),
    ...(tools ? [tools] : []),
    ...(fails ? [th.fg("error", `${FAIL_ICON} ${fails} failed`)] : []),
    ...(ms ? [th.fg("dim", duration(ms))] : []),
  ];
  return fit(d, `${th.fg("accent", open ? "▾ " : "▸ ")}${parts.join(sep(th))}`);
};

// Thinking in an opened group: one line, the newest words of the text.
const thoughtRow = (d: Draw, text: string, indent: string): string => {
  const { th } = d;
  const lines = text.split("\n").filter((l) => l.trim()).length;
  return withRight(
    d,
    `${indent}${th.fg("thinkingMedium", THINK_ICON)} ${th.fg("thinkingMedium", "thinking")}${sep(th)}${th.italic(th.fg("dim", oneLine(text)))}`,
    th.fg("dim", `${lines} lines`),
  );
};

const opened = (d: Draw, group: readonly Call[], width: number): string[] =>
  group.flatMap((c) => {
    const k = kindOf(c.name);
    const think = thoughts.get(c.id);
    const before = think ? [thoughtRow({ ...d, width }, think, "  ")] : [];
    if (k === "edit" || k === "write") return [...before, ...fileBlock({ ...d, width }, c, false, "  ")];
    if (k === "ask_user_question") return [...before, ...askBlock({ ...d, width }, c, "  ")];
    return [...before, ...callRow(d, c, "  ")];
  });

const isActive = (c: Call): boolean => c.status === "running" || c.status === "pending";

// Output rows kept for a call in flight in the expanded view.
const LIVE_LINES = 12;

// A call in flight, expanded: its row, then the tail of what it has printed so far.
const liveBlock = (d: Draw, c: Call, indent: string): string[] => {
  const { th } = d;
  const lines = c.output.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\s+$/, "").split("\n");
  const tail = c.output.trim() ? lines.slice(-LIVE_LINES) : [];
  const hidden = c.output.trim() ? lines.length - tail.length : 0;
  const rail = (i: number) => th.fg("borderMuted", i === tail.length - 1 ? "╰ " : "│ ");
  return [
    ...callRow(d, c, indent),
    ...(hidden > 0 ? [fit(d, `${indent}  ${th.fg("borderMuted", "│ ")}${th.fg("dim", `… ${hidden} earlier lines`)}`)] : []),
    ...tail.map((l, i) => fit(d, `${indent}  ${rail(i)}${th.fg("toolOutput", l.replaceAll("\t", "  "))}`)),
  ];
};

// The calls of a live run. Collapsed, the finished ones fold into a summary and the one in flight is
// drawn by the working row; expanded, the one in flight also shows its output as it streams.
const runLines = (d: Draw, run: readonly Call[], expanded: boolean): string[] => {
  const done = run.filter((c) => !isActive(c));
  const visible = done.filter((c) => levelOf(c.name) !== "hidden");
  if (!expanded) return visible.length ? [summaryLine(d, done, false)] : [];
  const live = run.filter((c) => isActive(c) && levelOf(c.name) !== "hidden");
  return [
    ...(visible.length ? [summaryLine(d, done, true), ...opened(d, visible, d.width)] : []),
    ...live.flatMap((c) => liveBlock(d, c, "  ")),
  ];
};

// Edit and write: header, then a delta-style unified diff with a gutter line down the whole block.
const fileBlock = (d: Draw, c: Call, expanded: boolean, indent = ""): string[] => {
  const { th } = d;
  const p = paletteFor(th);
  const kind = kindOf(c.name);
  const path = str(c.args.path) ?? str(c.args.file_path) ?? "";
  const { add, rem } = diffStats(c);
  const stats =
    c.status === "fail" ? "" : `  ${th.fg("success", `+${add}`)}${rem ? ` ${th.fg("error", `-${rem}`)}` : ""}`;
  const header = withRight(
    d,
    `${indent}${leadFor(th, c)} ${th.bold(th.fg(c.status === "fail" ? "error" : "toolOutput", kind))}  ${th.fg("text", shortPath(path, c.cwd))}${stats}`,
    rightOf(th, c),
  );

  if (c.status === "fail") {
    const why = errorLine(c.output);
    return why ? [header, fit(d, `${indent}  ${th.fg("borderMuted", "╰ ")}${th.fg("error", why)}`)] : [header];
  }

  const lines: DiffLine[] =
    kind === "write"
      ? (str(c.args.content) ?? "")
          .replace(/\n$/, "")
          .split("\n")
          .map((code, i) => ({ kind: "+" as const, n: i + 1, code }))
      : parseDiff(str((c.details as { diff?: unknown } | undefined)?.diff) ?? "");
  if (!lines.length || (kind === "write" && !str(c.args.content))) return [header];

  const cap = kind === "write" ? config.writeLines : config.diffLines;
  const shown = expanded ? lines : lines.slice(0, cap);
  const more = lines.length - shown.length;
  const numWidth = Math.max(...shown.map((l) => (l.kind === "gap" ? 1 : String(l.n).length)));
  const lang = getLanguageFromPath(path);
  const emph = emphasis(shown);
  const gutterWidth = visibleWidth(d.pad + indent) + 4;

  const body = shown.map((l, i) => {
    const last = i === shown.length - 1 && more === 0;
    const gutter = `${indent}  ${th.fg("borderMuted", last ? "╰ " : "│ ")}`;
    if (l.kind === "gap") return fit(d, `${gutter}${th.fg("dim", "⋯".padStart(numWidth))}`);
    const code = highlight(l.code.replaceAll("\t", "  "), lang);
    if (l.kind === " ") {
      return fit(d, `${gutter}${th.fg("dim", String(l.n).padStart(numWidth))}   ${code}`);
    }
    const plus = l.kind === "+";
    const bg = plus ? p.plusBg : p.minusBg;
    const color = plus ? "success" : "error";
    const range = emph.get(i);
    const painted = range
      ? sliceByColumn(code, 0, range[0]) +
        underBg(sliceByColumn(code, range[0], range[1] - range[0]), plus ? p.plusEmph : p.minusEmph) +
        bg +
        sliceByColumn(code, range[1], Number.MAX_SAFE_INTEGER)
      : code;
    const text = `${th.bold(th.fg(color, String(l.n).padStart(numWidth)))} ${th.fg(color, l.kind)} ${painted}`;
    const room = Math.max(0, d.width - gutterWidth);
    const clipped = truncateToWidth(text, room, "…");
    const fill = " ".repeat(Math.max(0, room - visibleWidth(clipped)));
    return `${d.pad}${gutter}${underBg(clipped + fill, bg)}${RESET}`;
  });
  if (more > 0) {
    const hint = keyText("app.tools.expand");
    body.push(
      fit(d, `${indent}  ${th.fg("borderMuted", "╰ ")}${th.fg("dim", `… +${more} more lines${hint ? `  ${hint}` : ""}`)}`),
    );
  }
  return [header, ...body];
};

type AskAnswer = { question?: string; answer?: string | null; selected?: string[]; notes?: string };

// Ask: the headers, then each question with the answer it got.
const askBlock = (d: Draw, c: Call, indent = ""): string[] => {
  const { th } = d;
  const questions = (c.args.questions as { header?: string; question?: string }[] | undefined) ?? [];
  const details = c.details as { answers?: AskAnswer[]; cancelled?: boolean } | undefined;
  const head = withRight(
    d,
    `${indent}${leadFor(th, c)} ${th.bold(th.fg(c.status === "fail" ? "error" : "toolOutput", "ask"))}  ${th.fg("accent", summarize(c))}`,
    rightOf(th, c),
  );
  if (c.status === "fail") {
    const why = errorLine(c.output);
    return why ? [head, fit(d, `${indent}  ${th.fg("borderMuted", "╰ ")}${th.fg("error", why)}`)] : [head];
  }
  if (!details) return [head];
  const rows = details.cancelled
    ? [th.fg("dim", "no answer")]
    : (details.answers ?? []).map((a, i) => {
        const label = questions[i]?.header ?? a.question ?? `#${i + 1}`;
        const text = a.selected?.length ? a.selected.join(", ") : (a.answer ?? "—");
        return `${th.fg("toolDiffContext", label)}  ${th.fg("success", "✓")} ${th.fg("text", oneLine(text))}${a.notes ? th.fg("dim", `  · ${oneLine(a.notes)}`) : ""}`;
      });
  return [
    head,
    ...rows.map((r, i) => fit(d, `${indent}  ${th.fg("borderMuted", i === rows.length - 1 ? "╰ " : "│ ")}${r}`)),
  ];
};

const highlight = (code: string, lang: string | undefined): string => {
  if (!lang) return code;
  try {
    return highlightCode(code, lang)[0] ?? code;
  } catch {
    return code;
  }
};

// Word emphasis for paired -/+ lines: the changed middle between a common prefix and suffix.
const emphasis = (lines: readonly DiffLine[]): Map<number, [number, number]> => {
  const out = new Map<number, [number, number]>();
  let i = 0;
  while (i < lines.length) {
    if (lines[i]!.kind !== "-") {
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && lines[j]!.kind === "-") j++;
    let k = j;
    while (k < lines.length && lines[k]!.kind === "+") k++;
    const pairs = Math.min(j - i, k - j);
    for (let n = 0; n < pairs; n++) {
      const a = (lines[i + n] as { code: string }).code.replaceAll("\t", "  ");
      const b = (lines[j + n] as { code: string }).code.replaceAll("\t", "  ");
      let pre = 0;
      while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
      let suf = 0;
      while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
      const changedA = a.length - pre - suf;
      const changedB = b.length - pre - suf;
      // Mostly rewritten lines read better without word emphasis.
      if (Math.max(changedA, changedB) > 0.6 * Math.max(a.length, b.length)) continue;
      if (changedA > 0) out.set(i + n, [visibleWidth(a.slice(0, pre)), visibleWidth(a.slice(0, a.length - suf))]);
      if (changedB > 0) out.set(j + n, [visibleWidth(b.slice(0, pre)), visibleWidth(b.slice(0, b.length - suf))]);
    }
    i = k;
  }
  return out;
};

// What one tool row draws at frame time.
const drawRow = (id: string, d: Draw, expanded: boolean): string[] => {
  const self = calls.get(id);
  if (!self) return [];
  const seg = segmentOf.get(id);
  const ids = seg?.ids ?? [id];
  const live = !seg || seg.index >= liveFrom;
  const resolve = (ids: readonly string[]): Call[] => ids.flatMap((i) => calls.get(i) ?? []);

  if (!live) {
    if (ids[0] !== id) return [];
    const group = resolve(ids);
    if (!group.some((c) => levelOf(c.name) !== "hidden")) return [];
    return expanded ? [summaryLine(d, group, true), ...opened(d, group, d.width)] : [summaryLine(d, group, false)];
  }

  if (levelOf(self.name) === "always") {
    return kindOf(self.name) === "ask_user_question" ? askBlock(d, self) : fileBlock(d, self, expanded);
  }
  const run = liveGroups(ids).find((g) => g.includes(id)) ?? [id];
  if (run[0] !== id) return [];
  return runLines(d, resolve(run), expanded);
};

// ── components ──────────────────────────────────────────────────────────────────────────────────────

class Row implements Component {
  theme: Theme | undefined;
  expanded = false;
  pad = 1;

  constructor(readonly id: string) {}

  render(width: number): string[] {
    if (!this.theme) return [];
    return drawRow(this.id, { th: this.theme, width, pad: " ".repeat(this.pad) }, this.expanded);
  }

  invalidate(): void {}
}

const EMPTY = new Container();

const renderersFor = (name: string): ToolRenderers => ({
  renderShell: "self",
  renderCall: (_args, theme, context) => {
    const ctx = context as unknown as RenderCtx;
    noteContext(name, ctx);
    const row = context.lastComponent instanceof Row ? context.lastComponent : new Row(ctx.toolCallId);
    row.theme = theme;
    row.expanded = ctx.expanded;
    row.pad = ctx.outputPad;
    tick();
    return row;
  },
  renderResult: (result, _options, _theme, context) => {
    noteContext(name, context as unknown as RenderCtx, result);
    tick();
    return EMPTY;
  },
});

// Elapsed time in the working row while anything runs.
let timer: ReturnType<typeof setInterval> | undefined;
const tick = (): void => {
  if (agentRunning) startTimer();
  syncWorking();
};
const startTimer = (): void => {
  if (timer) return;
  timer = setInterval(() => {
    if (!agentRunning) return stopTimer();
    syncWorking();
    if (busy()) requestRender();
  }, 80);
};
const stopTimer = (): void => {
  if (timer) clearInterval(timer);
  timer = undefined;
};
let agentRunning = false;
let runStartedAt = 0;
const busy = (): boolean =>
  agentRunning && [...calls.values()].some(isActive);

// ── working row ─────────────────────────────────────────────────────────────────────────────────

type UI = ExtensionContext["ui"];
let ui: UI | undefined;
let workingText: string | undefined;
let thinkingNow: string | undefined;

const lastThoughtLine = (m: MessageLike): string | undefined => {
  if (!Array.isArray(m.content)) return undefined;
  const blocks = m.content as Block[];
  const last = blocks.at(-1);
  if (last?.type !== "thinking") return undefined;
  const line = (last.thinking ?? "").split("\n").map((l) => l.trim()).filter(Boolean).at(-1);
  return line ? oneLine(line) : undefined;
};

const inLiveSegment = (id: string): boolean => {
  const seg = segmentOf.get(id);
  return !seg || seg.index >= liveFrom;
};

// The run's clock, the first thing on the working row: it stays put while the rest changes.
const runClock = (th: Theme): string =>
  `${th.fg("accent", `${RUN_ICON} ${duration(Date.now() - runStartedAt)}`)}${sep(th)}`;

const rowWidth = (): number => Math.max(10, (process.stdout.columns || 80) - 6);

// The call in flight: a summary that gives way when the row is full, so its own time always shows.
const workingLine = (th: Theme, active: readonly Call[], room: number): string => {
  const c = active[0]!;
  const time = elapsed(c);
  const tail = time ? `${sep(th)}${th.fg("dim", time)}` : "";
  const main = [
    `${th.fg(CHIP_COLORS[kindOf(c.name)] ?? "toolDiffContext", iconOf(c.name))} ${summarize(c) ? styledSummary(th, c, "toolOutput") : th.fg("toolOutput", kindOf(c.name))}`,
    ...(active.length > 1 ? [th.fg("muted", `+${active.length - 1}`)] : []),
  ].join(sep(th));
  return truncateToWidth(main, Math.max(8, room - visibleWidth(tail)), "…") + tail;
};

// Show the call in flight in pi's working row, changing its text in place so nothing shifts.
const syncWorking = (): void => {
  if (!ui) return;
  const active = agentRunning
    ? [...calls.values()].filter((c) => isActive(c) && levelOf(c.name) === "live" && inLiveSegment(c.id))
    : [];
  const th = ui.theme;
  const clock = agentRunning ? runClock(th) : "";
  const room = rowWidth() - visibleWidth(clock);
  const next = active.length
    ? clock + workingLine(th, active, room)
    : agentRunning && thinkingNow
      ? clock +
        truncateToWidth(
          `${th.fg("thinkingMedium", THINK_ICON)} ${th.fg("thinkingMedium", "thinking")}${sep(th)}${th.italic(th.fg("dim", thinkingNow))}`,
          room,
          "…",
        )
      : agentRunning
        ? `${clock}${th.fg("muted", "Working")}`
        : undefined;
  if (next === workingText) return;
  workingText = next;
  ui.setWorkingMessage(next);
};

// ── working row spacing ─────────────────────────────────────────────────────────────────────────────
// pi puts one blank row between the status area and the editor (the spacer at the top of the widget
// area above the editor). While the working row is showing, that row separates nothing, so the gap is
// dropped and the working row sits directly on the editor.

type Node = { children?: Node[]; render?: (width: number) => string[] };
const GAP_PATCHED = Symbol.for("quiet-tools.gap");

const findParent = (root: Node, target: Node): { parent: Node; index: number } | undefined => {
  for (const [index, child] of (root.children ?? []).entries()) {
    if (child === target) return { parent: root, index };
    const deeper = findParent(child, target);
    if (deeper) return deeper;
  }
  return undefined;
};

// pi-subagents indents its status rows by two columns, which sets them apart from the footer under them.
// Rows in the area below the editor start at the left edge, like the footer.
const flushLeft = (below: Node): void => {
  const marked = below as Record<symbol, unknown>;
  if (!below.render || marked[GAP_PATCHED]) return;
  const render = below.render.bind(below);
  marked[GAP_PATCHED] = true;
  below.render = (width) => render(width).map((line) => (line.startsWith("  ") ? line.slice(2) : line));
};

const tightenWorkingGap = (ui: UI | undefined): void => {
  if (!ui) return;
  // A widget below the editor draws no rows; its factory is the way to reach the root of the tree.
  ui.setWidget(
    "quiet-tools-gap",
    (tui) => {
      tuiHandle = tui;
      const probe: Node = { render: () => [] };
      queueMicrotask(() => {
        // widgets below editor > editor > widgets above > status, as siblings in one container
        const below = findParent(tui as unknown as Node, probe);
        const row = below && findParent(tui as unknown as Node, below.parent);
        if (!row) return;
        flushLeft(below.parent);
        const siblings = row.parent.children ?? [];
        const above = siblings[row.index - 2];
        const status = siblings[row.index - 3];
        if (!above?.render || !status || (above as Record<symbol, unknown>)[GAP_PATCHED]) return;
        const render = above.render.bind(above);
        (above as Record<symbol, unknown>)[GAP_PATCHED] = true;
        above.render = (width) => {
          const lines = render(width);
          return (status.children?.length ?? 0) > 0 && lines[0]?.trim() === "" ? lines.slice(1) : lines;
        };
      });
      return Object.assign(probe, { invalidate() {} }) as never;
    },
    { placement: "belowEditor" },
  );
};

// ── wiring ──────────────────────────────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  pi.registerToolRenderer((toolName, next) => (levelOf(toolName) === "native" ? next() : renderersFor(toolName)));

  pi.on("session_start", (_event, ctx) => {
    config = readConfig((pi.getSettings() as Record<string, unknown>).quietTools);
    agentRunning = false;
    stopTimer();
    ui = ctx.hasUI ? ctx.ui : undefined;
    ui?.setHiddenThinkingLabel("");
    tightenWorkingGap(ui);
    workingText = undefined;
    thinkingNow = undefined;
    ingestBranch(ctx);
  });
  pi.on("session_tree", (_event, ctx) => ingestBranch(ctx));
  pi.on("session_compact", (_event, ctx) => ingestBranch(ctx));

  pi.on("agent_start", () => {
    agentRunning = true;
    runStartedAt = Date.now();
    startTimer();
    syncWorking();
    rebuild();
    liveFrom = segments.length;
  });
  pi.on("agent_settled", () => {
    agentRunning = false;
    liveFrom = Number.POSITIVE_INFINITY;
    for (const c of calls.values()) if (isActive(c)) c.status = "fail";
    thinkingNow = undefined;
    stopTimer();
    syncWorking();
    requestRender();
    // The run's rows just collapsed. A differential render leaves the editor where the taller
    // transcript ended, mid-screen; a full redraw puts the transcript end, and the editor, at the bottom.
    tuiHandle?.requestRender(true);
  });

  pi.on("message_start", ({ message }) => {
    const m = message as MessageLike;
    if (m.role === "assistant") streaming = itemsOfMessage(m);
    else committed.push(...itemsOfMessage(m));
    rebuild();
  });
  pi.on("message_update", ({ message }) => {
    const m = message as MessageLike;
    if (m.role !== "assistant") return;
    streaming = itemsOfMessage(m);
    rebuild();
    thinkingNow = lastThoughtLine(m);
    syncWorking();
  });
  pi.on("message_end", ({ message }) => {
    const m = message as MessageLike;
    if (m.role !== "assistant") return;
    committed.push(...itemsOfMessage(m));
    noteThought(m);
    streaming = [];
    thinkingNow = undefined;
    rebuild();
    syncWorking();
  });

  pi.on("tool_execution_start", (event) => {
    if (event.parentToolCallId) return;
    const c = calls.get(event.toolCallId);
    if (c) c.startedAt ??= Date.now();
    syncWorking();
  });
  pi.on("tool_execution_end", (event) => {
    if (event.parentToolCallId) return;
    const c = calls.get(event.toolCallId);
    if (!c) return;
    c.status = event.isError ? "fail" : "ok";
    if (event.durationMs !== undefined) c.durationMs = event.durationMs;
    syncWorking();
  });
}

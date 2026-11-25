// A small boxed header in place of pi's startup banner: version, model, directory, git branch, and the
// context files, skills and prompts that were picked up.
// Display only; every key still goes to the editor. It sits at the top of the transcript, so it scrolls
// away with the first messages.
//
// While the conversation is shorter than the terminal, blank rows after the header push the editor and
// footer to the bottom of the screen; they shrink to nothing as the transcript grows.
//
// Settings (`dashboard` in settings.json, all optional):
//   enabled: false restores pi's own header (default true)
//
// Set `"quietStartup": true` in settings.json to hide the resource listing below it.
import { homedir } from "node:os";
import { VERSION, type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type Git = { branch: string; detached: boolean; ahead: number; behind: number; changed: number; untracked: number };

const pad = (s: string, width: number): string => s + " ".repeat(Math.max(0, width - visibleWidth(s)));

const tildePath = (cwd: string): string => {
  const home = homedir();
  return cwd === home ? "~" : cwd.startsWith(`${home}/`) ? `~${cwd.slice(home.length)}` : cwd;
};

// Left-truncate a path to its tail: `…/projects/temp`.
const tailPath = (path: string, width: number): string => {
  if (visibleWidth(path) <= width) return path;
  const parts = path.split("/");
  let out = parts.pop() ?? "";
  while (parts.length && visibleWidth(`…/${parts.at(-1)}/${out}`) <= width) out = `${parts.pop()}/${out}`;
  return `…/${out}`;
};

const parseGit = (status: string): Git | undefined => {
  let branch = "";
  let ahead = 0;
  let behind = 0;
  let changed = 0;
  let untracked = 0;
  for (const line of status.split("\n")) {
    if (line.startsWith("# branch.head ")) branch = line.slice(14).trim();
    else if (line.startsWith("# branch.ab ")) {
      const m = /\+(\d+) -(\d+)/.exec(line);
      ahead = Number(m?.[1] ?? 0);
      behind = Number(m?.[2] ?? 0);
    } else if (line.startsWith("1 ") || line.startsWith("2 ") || line.startsWith("u ")) changed++;
    else if (line.startsWith("? ")) untracked++;
  }
  return branch
    ? { branch: branch === "(detached)" ? "detached" : branch, detached: branch === "(detached)", ahead, behind, changed, untracked }
    : undefined;
};

const gitText = (th: Theme, g: Git): string => {
  const marks = [
    g.ahead ? th.fg("success", `↑${g.ahead}`) : "",
    g.behind ? th.fg("warning", `↓${g.behind}`) : "",
    g.changed ? th.fg("warning", `✎${g.changed}`) : "",
    g.untracked ? th.fg("dim", `?${g.untracked}`) : "",
  ].filter(Boolean);
  return `${th.fg(g.detached ? "warning" : "text", g.branch)}${marks.length ? `  ${marks.join(" ")}` : ""}`;
};

const MAX_WIDTH = 88;

type Loaded = { context: string[]; skills: string[]; prompts: string[] };

// Names joined to fit one row; what does not fit becomes `+N`.
const names = (th: Theme, items: readonly string[], width: number): string => {
  if (!items.length) return th.fg("dim", "none");
  for (let shown = items.length; shown > 0; shown--) {
    const rest = items.length - shown;
    const text = items.slice(0, shown).join(", ") + (rest ? ` +${rest}` : "");
    if (visibleWidth(text) <= width) return th.fg("text", items.slice(0, shown).join(", ")) + (rest ? th.fg("dim", ` +${rest}`) : "");
  }
  return th.fg("dim", `${items.length}`);
};

const render = (
  th: Theme,
  git: Git | undefined,
  loaded: Loaded,
  width: number,
  info: { model: string; thinking: string; cwd: string },
): string[] => {
  const outer = Math.min(width - 2, MAX_WIDTH);
  if (outer < 24) return [""];
  const inner = outer - 4;
  const border = (s: string) => th.fg("borderMuted", s);
  const row = (text: string) => ` ${border("│")} ${pad(truncateToWidth(text, inner), inner)} ${border("│")}`;
  const field = (label: string, value: string) => `${th.fg("dim", pad(`${label}:`, 11))}${value}`;
  const valueWidth = inner - 11;

  const rows = [
    `${th.bold(th.fg("accent", "π pi"))} ${th.fg("dim", `v${VERSION}`)}`,
    "",
    field("model", `${th.fg("text", info.model)}${info.thinking ? th.fg("dim", ` · ${info.thinking}`) : ""}`),
    field("directory", th.fg("text", tailPath(info.cwd, valueWidth))),
    ...(git ? [field("branch", gitText(th, git))] : []),
    ...(loaded.context.length ? [field("context", names(th, loaded.context, valueWidth))] : []),
    ...(loaded.skills.length ? [field("skills", names(th, loaded.skills, valueWidth))] : []),
    ...(loaded.prompts.length ? [field("prompts", names(th, loaded.prompts, valueWidth))] : []),
  ];
  return [
    "",
    ` ${border(`╭${"─".repeat(outer - 2)}╮`)}`,
    ...rows.map(row),
    ` ${border(`╰${"─".repeat(outer - 2)}╯`)}`,
    FILL,
  ].map((l) => truncateToWidth(l, width));
};

// ── bottom pinning ────────────────────────────────────────────────────────────────────────────────

// The header's last line. The TUI's render swaps it for as many blank rows as the screen has to spare.
const FILL = "\u2063\u2063\u2063";
const PATCHED = Symbol.for("dashboard.pinBottom");

type Tui = { render(width: number): string[]; terminal: { rows: number } };

const pinBottom = (tui: Tui): void => {
  const marked = tui as unknown as Record<symbol, unknown>;
  if (marked[PATCHED]) return;
  marked[PATCHED] = true;
  const render = tui.render.bind(tui);
  tui.render = (width) => {
    const lines = render(width);
    const at = lines.indexOf(FILL);
    if (at < 0) return lines;
    const spare = Math.max(0, tui.terminal.rows - (lines.length - 1));
    return [...lines.slice(0, at), ...Array<string>(spare).fill(""), ...lines.slice(at + 1)];
  };
};

// ── wiring ────────────────────────────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let generation = 0; // a newer session start retires the load still in flight
  pi.on("session_start", async (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    const settings = (pi.getSettings() as Record<string, unknown>).dashboard as Record<string, unknown> | undefined;
    if (settings?.enabled === false) return;

    // A context file is shown from the working directory when it lives there, else from home.
    const system = ctx.getSystemPrompt();
    const all = (re: RegExp): string[] => [...system.matchAll(re)].map((m) => m[1]!);
    const loaded: Loaded = {
      context: all(/<project_instructions path="([^"]+)"/g).map((path) =>
        path.startsWith(`${ctx.cwd}/`) ? path.slice(ctx.cwd.length + 1) : tildePath(path),
      ),
      skills: all(/<skill>\s*<name>([^<]+)<\/name>/g).sort(),
      prompts: pi
        .getCommands()
        .filter((c) => c.source === "prompt")
        .map((c) => c.name)
        .sort(),
    };

    let git: Git | undefined;
    let redraw: (() => void) | undefined;
    const mine = ++generation;

    ctx.ui.setHeader((tui, theme) => {
      redraw = () => tui.requestRender();
      pinBottom(tui as unknown as Tui);
      return {
        invalidate() {},
        render(width: number): string[] {
          const m = ctx.model;
          const level = pi.getThinkingLevel();
          return render(theme, git, loaded, width, {
            model: m ? (m.name || m.id) : "no model",
            thinking: m?.reasoning && level !== "off" ? level : "",
            cwd: tildePath(ctx.cwd),
          });
        },
      };
    });

    try {
      const status = await pi.exec("git", ["status", "--porcelain=2", "--branch"], { cwd: ctx.cwd, timeout: 3000 });
      if (status.code === 0 && mine === generation) {
        git = parseGit(status.stdout);
        redraw?.();
      }
    } catch {
      // Not a repository, or git is missing: the branch row stays out.
    }
  });
}

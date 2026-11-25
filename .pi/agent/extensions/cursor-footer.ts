// Cursor-CLI-style footer: one muted row, no backgrounds or glyphs.
//   <model> <window> <thinking> · <ctx %>          <extension statuses>  <cwd> · <branch>
// When a router model (e.g. the gateway's "auto") answers with a different model, the head reads
// `Auto → Opus 5.5 (O3 H2)`: the latest routed model, plus the per-prompt mix when it is not uniform.
// The cwd gives way first when the row is tight: its leading directories shrink to `…/`, then it
// is dropped and only the branch stays.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const tilde = (p: string): string => {
  const home = homedir();
  return p === home ? "~" : p.startsWith(home + "/") ? "~" + p.slice(home.length) : p;
};

const window$ = (n: number): string =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// MCP health, inferred from the tool registry: a configured, enabled server that has registered
// tools is up; one without (connecting, failed, needs sign-in) is down. Keys are sanitized the way
// pi does for tool prefixes. Healthy shows nothing; startup shows progress; after the grace period
// missing servers are named.
const MCP_GRACE_MS = 15_000;

type McpServer = { readonly name: string; readonly key: string };

const mcpKey = (name: string): string => name.replace(/[^A-Za-z0-9_]/g, "_");

const readServers = (file: string): Record<string, { enabled?: boolean }> => {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")).mcpServers ?? {}) : {};
  } catch {
    return {};
  }
};

const enabledMcpServers = (cwd: string): readonly McpServer[] => {
  const merged = {
    ...readServers(join(homedir(), ".pi/agent/mcp.json")),
    ...readServers(join(cwd, ".pi/mcp.json")),
  };
  return Object.entries(merged)
    .filter(([, cfg]) => cfg?.enabled !== false)
    .map(([name]) => ({ name, key: mcpKey(name) }));
};

// The model a router actually picked, as reported in the Anthropic stream's message_start event.
const routedModelId = (data: unknown): string | undefined => {
  if (typeof data !== "object" || data === null) return undefined;
  const { type, message } = data as { type?: unknown; message?: { model?: unknown } };
  return type === "message_start" && typeof message?.model === "string" ? message.model : undefined;
};

const shortName = (name: string): string => name.replace(/^Claude\s+/i, "");

type Routing = {
  readonly last: string | undefined;
  // Requests per routed model id since the current prompt started.
  readonly mix: ReadonlyMap<string, number>;
};

const noRouting: Routing = { last: undefined, mix: new Map() };

export default function (pi: ExtensionAPI) {
  let routing = noRouting;
  let rerender = (): void => {};

  const resetRouting = (): void => {
    routing = noRouting;
    rerender();
  };

  pi.on("model_select", resetRouting);
  pi.on("agent_start", () => {
    routing = { last: routing.last, mix: new Map() };
  });
  pi.on("provider_stream_event", (event) => {
    const id = routedModelId(event.data);
    if (id === undefined || id === event.model) return;
    routing = { last: id, mix: new Map(routing.mix).set(id, (routing.mix.get(id) ?? 0) + 1) };
    rerender();
  });

  pi.on("session_start", (_event, ctx) => {
    routing = noRouting;
    if (!ctx.hasUI) return;
    const servers = enabledMcpServers(ctx.cwd);
    const startedAt = Date.now();

    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());
      rerender = () => tui.requestRender();
      const dim = (s: string) => theme.fg("dim", s);

      const displayName = (provider: string, id: string): string =>
        shortName(ctx.modelRegistry.find(provider, id)?.name ?? id);

      // `Auto → Opus 5.5 (O3 H2)`; plain model name when nothing was routed.
      const modelLabel = (): string => {
        const model = ctx.model;
        if (!model) return "no model";
        const base = model.name ?? model.id;
        const { last, mix } = routing;
        if (last === undefined) return base;
        const counts = new Map<string, number>();
        for (const [id, n] of mix) {
          const initial = displayName(model.provider, id).charAt(0).toUpperCase();
          counts.set(initial, (counts.get(initial) ?? 0) + n);
        }
        const breakdown =
          counts.size > 1 ? ` (${[...counts].map(([initial, n]) => `${initial}${n}`).join(" ")})` : "";
        return `${base.replace(/\s*\(.*\)$/, "")} → ${displayName(model.provider, last)}${breakdown}`;
      };

      const poll = setInterval(() => tui.requestRender(), 3000);

      const mcpStatus = (): string => {
        if (servers.length === 0) return "";
        const live = new Set(
          pi.getAllTools().flatMap((t) => /^mcp__(.+?)__/.exec(t.name)?.[1] ?? []),
        );
        const down = servers.filter((s) => !live.has(s.key));
        if (down.length === 0) return "";
        return Date.now() - startedAt < MCP_GRACE_MS
          ? dim(`mcp connecting ${servers.length - down.length}/${servers.length}`)
          : theme.fg("warning", `mcp down: ${down.map((s) => s.name).join(", ")}`);
      };

      // The tail of a path that fits `room` columns: `…/projects/temp`, or just the last directory.
      const fitPath = (path: string, room: number): string => {
        if (visibleWidth(path) <= room) return path;
        const parts = path.split("/").filter(Boolean);
        let out = parts.pop() ?? "";
        if (visibleWidth(out) > room) return "";
        while (parts.length && visibleWidth(`…/${parts.at(-1)}/${out}`) <= room) out = `${parts.pop()}/${out}`;
        return parts.length ? `…/${out}` : out;
      };

      // Context use turns yellow, then red, as the window fills.
      const pctColor = (percent: number | null | undefined): "dim" | "warning" | "error" =>
        percent == null || percent < 70 ? "dim" : percent < 90 ? "warning" : "error";

      return {
        dispose() {
          unsub();
          rerender = () => {};
          clearInterval(poll);
        },
        invalidate() {},
        render(width: number): string[] {
          const usage = ctx.getContextUsage();
          const model = ctx.model;
          const level = pi.getThinkingLevel();
          const win = usage?.contextWindow ?? model?.contextWindow;
          const pct = usage?.percent == null ? undefined : `${usage.percent.toFixed(1)}%`;

          const head = [modelLabel(), win ? window$(win) : "", level === "off" ? "" : cap(level)]
            .filter(Boolean)
            .join(" ");
          const left = dim(head) + (pct ? dim(" · ") + theme.fg(pctColor(usage?.percent), pct) : "");

          const allStatuses = [mcpStatus(), ...footerData.getExtensionStatuses().values()]
            .filter((s) => s.trim())
            .join("  ");
          const branch = footerData.getGitBranch();

          // Room left for the location once the model and statuses have their share.
          const gap = 3;
          // Statuses yield to the location when the row cannot hold both.
          const MIN_WHERE = 14;
          const statuses =
            allStatuses && width - visibleWidth(left) - visibleWidth(allStatuses) - 2 - gap >= MIN_WHERE ? allStatuses : "";
          const taken = visibleWidth(left) + (statuses ? visibleWidth(statuses) + 2 : 0) + gap;
          const room = Math.max(0, width - taken);
          const branchPart = branch ?? "";
          const pathRoom = room - (branchPart ? visibleWidth(branchPart) + 3 : 0);
          const path = pathRoom > 0 ? fitPath(tilde(ctx.cwd), pathRoom) : "";
          const where = dim([path, branchPart].filter(Boolean).join(" · "));

          const right = [statuses, where].filter(Boolean).join("  ");
          const space = width - visibleWidth(left) - visibleWidth(right);
          return [truncateToWidth(space >= 1 ? left + " ".repeat(space) + right : left, width)];
        },
      };
    });
  });
}

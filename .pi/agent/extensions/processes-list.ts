// Mirror @aliou/pi-processes processes into pi-subagents' FleetView as external runs,
// so subagents and processes share one list and one ↓ key below the editor.
// Display only: kill, pin, and full logs stay in /ps and /ps:logs.
import { join } from "node:path";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

type Info = {
  id: string;
  name: string;
  command: string;
  startTime: number;
  endTime: number | null;
  status: "running" | "terminating" | "terminate_timeout" | "exited" | "killed";
  success: boolean | null;
  stdoutFile: string;
};
type Line = { type: "stdout" | "stderr"; text: string };
type RunState = "running" | "completed" | "failed" | "stopped";
type ExternalRun = {
  id: string;
  sessionId: string;
  source: string;
  label: string;
  state: RunState;
  startedAt: number;
  updatedAt?: number;
  endedAt?: number;
  currentAction?: string;
  preview?: string;
  transcriptPath?: string;
};
type Registry = {
  registerExternalRun(run: ExternalRun): unknown;
  updateExternalRun(sessionId: string, id: string, update: Partial<ExternalRun>): unknown;
  unregisterExternalRun(sessionId: string, id: string): boolean;
};

const SOURCE = "pi-processes";
const REFRESH_MS = 1000;

// The registry rejects control characters and anything over its length limits.
const clean = (s: string, max: number) => {
  // eslint-disable-next-line no-control-regex
  const t = s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
};

const runState = (p: Info): RunState =>
  p.status === "running" || p.status === "terminating" || p.status === "terminate_timeout"
    ? "running"
    : p.status === "killed"
      ? "stopped"
      : p.success
        ? "completed"
        : "failed";

export default function (pi: ExtensionAPI) {
  let registry: Registry | undefined;
  let sessionId: string | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let unsubscribers: Array<() => void> = [];
  const mirrored = new Map<string, string>(); // process id -> last pushed fingerprint

  const list = (): Info[] => {
    let result: Info[] = [];
    pi.events.emit("processes:request:list", { reply: (r: Info[]) => (result = r) });
    return result;
  };

  const tail = (id: string, n: number): Line[] => {
    let lines: Line[] | null = null;
    pi.events.emit("processes:request:combined_output", { id, tailLines: n, reply: (l: Line[] | null) => (lines = l) });
    return lines ?? [];
  };

  const sync = () => {
    if (!registry || !sessionId) return;
    const seen = new Set<string>();
    for (const p of list()) {
      seen.add(p.id);
      const lines = tail(p.id, 20);
      const last = lines.at(-1);
      const state = runState(p);
      const run: ExternalRun = {
        id: p.id,
        sessionId,
        source: SOURCE,
        label: `process: ${clean(p.name, 140) || p.id}`,
        state,
        startedAt: p.startTime,
        updatedAt: Date.now(),
        ...(p.endTime != null ? { endedAt: p.endTime } : {}),
        currentAction: clean(last ? last.text : p.command, 160) || undefined,
        preview: clean(lines.map((l) => l.text).join("\n"), 4096) || undefined,
        transcriptPath: p.stdoutFile,
      };
      const fingerprint = JSON.stringify([state, run.endedAt, run.currentAction, run.preview]);
      if (mirrored.get(p.id) === fingerprint) continue;
      try {
        if (mirrored.has(p.id)) {
          const { id: _i, sessionId: _s, source: _src, ...update } = run;
          registry.updateExternalRun(sessionId, p.id, update);
        } else {
          registry.registerExternalRun(run);
        }
        mirrored.set(p.id, fingerprint);
      } catch {
        // Invalid display text or a registry mismatch: skip this tick rather than break the session.
      }
    }
    for (const id of [...mirrored.keys()]) {
      if (seen.has(id)) continue;
      registry.unregisterExternalRun(sessionId, id);
      mirrored.delete(id);
    }
  };

  const stop = () => {
    for (const u of unsubscribers) u();
    unsubscribers = [];
    if (timer) clearInterval(timer);
    timer = undefined;
    if (registry && sessionId) for (const id of mirrored.keys()) registry.unregisterExternalRun(sessionId, id);
    mirrored.clear();
  };

  const start = async (ctx: ExtensionContext) => {
    stop();
    try {
      registry = (await import(join(getAgentDir(), "npm/node_modules/pi-subagents/bundle/external-runs.js"))) as Registry;
    } catch {
      return; // pi-subagents not installed
    }
    sessionId = ctx.sessionManager.getSessionFile() ?? ctx.sessionManager.getSessionId();
    unsubscribers.push(pi.events.on("processes:changed", sync));
    timer = setInterval(sync, REFRESH_MS);
    timer.unref?.();
    sync();
  };

  pi.on("session_start", (_e, ctx) => start(ctx));
  pi.on("session_shutdown", () => stop());
}

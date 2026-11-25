// Cursor-style message queue with escalation.
//   Enter while busy          -> message is queued; sent as a new prompt once the run finishes
//   Enter on empty editor     -> 1st press: every queued message becomes a steer
//                                (handed to pi in order at the next turn_end, before the next LLM call)
//                                2nd press: interrupt the run and send all steers now, in order
//                                Idle: send everything queued, in order
//   Up on empty editor        -> queue mode: Up/Down select, Enter escalate, Tab/e edit,
//                                Backspace/Delete/d remove, Esc leave
//   Esc (abort)               -> queued messages stay in the widget; nothing auto-sends
// Keys pass through untouched while anything but the editor has focus (a questionnaire, a selector).
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { isKeyRelease, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

type Item = { text: string; kind: "queued" | "steer" };

// pi-tui has no focus getter; this is the same structural check pi-subagents uses for its fleet widget.
const isEditor = (c: unknown): boolean => {
  const e = c as Record<string, unknown> | undefined;
  return (
    !!e &&
    typeof e === "object" &&
    ["render", "invalidate", "handleInput", "getText", "setText"].every((k) => typeof e[k] === "function")
  );
};

export default function (pi: ExtensionAPI) {
  let ctx: ExtensionContext | undefined;
  let queue: Item[] = [];
  let selected = -1; // -1 = not in queue mode
  let sendAfterSettle: string[] = []; // FIFO; sent as one message once the aborted run settles
  let requestRender: (() => void) | undefined;
  let tuiRef: { focusedComponent?: unknown } | undefined;

  const render = () => {
    if (!ctx) return;
    if (queue.length === 0) {
      selected = -1;
      ctx.ui.setWidget("steer-queue", undefined);
      requestRender = undefined;
      tuiRef = undefined;
      return;
    }
    ctx.ui.setWidget("steer-queue", (tui, theme) => {
      requestRender = () => tui.requestRender();
      tuiRef = tui as unknown as { focusedComponent?: unknown };
      return {
        invalidate() {},
        render(width: number): string[] {
          const inMode = selected >= 0;
          const editorEmpty = (ctx?.ui.getEditorText() ?? "").length === 0;
          const lines = [theme.fg("accent", `↳ ${queue.length} queued`)];
          queue.forEach((item, i) => {
            const one = item.text.replace(/\s+/g, " ");
            const text = one.length > 100 ? one.slice(0, 99) + "…" : one;
            const tag = item.kind === "steer" ? theme.fg("warning", "steer ") : theme.fg("dim", "queue ");
            const marker = inMode && i === selected ? theme.fg("accent", "▸ ") : "  ";
            const body = inMode && i === selected ? theme.fg("accent", text) : theme.fg("muted", text);
            lines.push(`  ${marker}${tag}${body}`);
          });
          const target = inMode ? queue[selected] : queue[queue.length - 1];
          const action = target?.kind === "steer" ? "interrupt and send now" : "steer";
          if (inMode) {
            lines.push(theme.fg("dim", `  ↑↓ select · <enter> ${action} · <tab> edit · <backspace> remove · <esc> back`));
          } else if (editorEmpty) {
            lines.push(theme.fg("dim", `  <enter> to ${action} · ↑ to manage`));
          }
          return lines.map((line) => truncateToWidth(line, width));
        },
      };
    });
  };

  const join = (texts: string[]) => texts.join("\n\n");

  const interrupt = (texts: string[]) => {
    const first = sendAfterSettle.length === 0;
    sendAfterSettle.push(...texts);
    if (first) ctx?.abort();
  };

  // One item (queue mode): queued -> steer; steer -> interrupt now (or plain send when idle)
  const escalateOne = (i: number, busy: boolean) => {
    const item = queue[i];
    if (!busy) {
      queue.splice(i, 1);
      pi.sendUserMessage(item.text);
    } else if (item.kind === "queued") {
      item.kind = "steer";
    } else {
      queue.splice(i, 1);
      interrupt([item.text]);
    }
  };

  // Whole queue (empty editor), oldest first: queued -> steer; all steers -> interrupt now
  const escalateAll = (busy: boolean) => {
    if (!busy) {
      const texts = queue.map((item) => item.text);
      queue = [];
      pi.sendUserMessage(join(texts));
    } else if (queue.some((item) => item.kind === "queued")) {
      for (const item of queue) item.kind = "steer";
    } else {
      const texts = queue.map((item) => item.text);
      queue = [];
      interrupt(texts);
    }
  };

  pi.on("session_start", (_e, c) => {
    if (!c.hasUI) return;
    ctx = c;
    queue = [];
    selected = -1;
    render();

    c.ui.onTerminalInput((data) => {
      if (isKeyRelease(data)) return undefined;
      if (tuiRef && !isEditor(tuiRef.focusedComponent)) {
        if (selected >= 0) {
          selected = -1;
          render();
        }
        return undefined;
      }
      setTimeout(() => requestRender?.(), 0);
      const busy = !c.isIdle();
      const empty = c.ui.getEditorText().length === 0;

      if (selected >= 0) {
        if (matchesKey(data, "up")) selected = Math.max(0, selected - 1);
        else if (matchesKey(data, "down")) selected = Math.min(queue.length - 1, selected + 1);
        else if (matchesKey(data, "escape")) selected = -1;
        else if (matchesKey(data, "enter")) {
          escalateOne(selected, busy);
          if (selected >= queue.length) selected = queue.length - 1;
        } else if (matchesKey(data, "tab") || data === "e") {
          const [item] = queue.splice(selected, 1);
          selected = -1;
          c.ui.setEditorText(item.text);
        } else if (matchesKey(data, "backspace") || matchesKey(data, "delete") || data === "d") {
          queue.splice(selected, 1);
          selected = Math.min(selected, queue.length - 1);
        }
        render();
        return { consume: true };
      }

      if (empty && queue.length > 0) {
        if (matchesKey(data, "enter")) {
          escalateAll(busy);
          render();
          return { consume: true };
        }
        if (matchesKey(data, "up")) {
          selected = queue.length - 1;
          render();
          return { consume: true };
        }
      }
      return undefined;
    });
  });

  pi.on("input", (event) => {
    if (event.source === "interactive" && event.streamingBehavior === "steer") {
      queue.push({ text: event.text, kind: "queued" });
      render();
      return { action: "handled" };
    }
    return { action: "continue" };
  });

  pi.on("turn_end", () => {
    const steers = queue.filter((item) => item.kind === "steer");
    if (steers.length === 0) return;
    queue = queue.filter((item) => item.kind !== "steer");
    selected = -1;
    render();
    for (const item of steers) pi.sendUserMessage(item.text, { deliverAs: "steer" });
  });

  pi.on("agent_settled", (event) => {
    let next = sendAfterSettle.length > 0 ? join(sendAfterSettle) : undefined;
    sendAfterSettle = [];
    if (next === undefined && !event.aborted && queue.length > 0) next = queue.shift()!.text;
    render();
    if (next !== undefined) pi.sendUserMessage(next);
  });
}

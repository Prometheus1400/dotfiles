// Make "jj" typed quickly in INSERT mode act as Esc (-> NORMAL) in pi-vim.
// pi-vim has no insert-mapping option, so this watches raw terminal input.
// A "j" in INSERT mode is held for up to TIMEOUT_MS (like vim's timeoutlen):
//   - second "j" in time  -> swallowed, Esc is sent instead
//   - any other key / timeout -> the held "j" is inserted at the cursor
// Handles both legacy input ("j") and kitty-protocol input ("\x1b[106u"),
// and ignores key-release events so a release doesn't flush the held "j".
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isKeyRelease, matchesKey } from "@earendil-works/pi-tui";

const TIMEOUT_MS = 250;

export default function (pi: ExtensionAPI) {
  let mode = "insert";
  pi.events.on("pi-vim:mode-change", (e: any) => {
    mode = e?.mode ?? mode;
  });

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;
    mode = "insert";
    let pending: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (pending === null) return;
      clearTimeout(pending);
      pending = null;
      ctx.ui.pasteToEditor("j");
      // pasteToEditor from a timer does not repaint; nudge a render.
      ctx.ui.setStatus("vim-jj", " ");
      ctx.ui.setStatus("vim-jj", undefined);
    };

    ctx.ui.onTerminalInput((data) => {
      if (isKeyRelease(data)) return undefined;
      const isJ = data === "j" || matchesKey(data, "j");
      if (pending !== null) {
        if (isJ && mode === "insert") {
          clearTimeout(pending);
          pending = null;
          return { data: "\x1b" };
        }
        flush();
        return undefined;
      }
      if (isJ && mode === "insert") {
        pending = setTimeout(flush, TIMEOUT_MS);
        return { consume: true };
      }
      return undefined;
    });
  });
}

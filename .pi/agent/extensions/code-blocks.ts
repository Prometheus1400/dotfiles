// Markdown tweaks. Table header rows take the heading color. Fenced code blocks lose their ``` rows and
// get the language as a dim italic label instead.
//
// Settings (`codeBlocks` in settings.json, all optional):
//   style: how a block is drawn (default "rail")
//     plain  label row, then the code
//     rail   a dim vertical bar down the left edge, with corners around the label and the end
//     rule   a thin line above (with the label in it) and below
//     bg     a background a little darker than the page
//   wrap: what a row wider than the pane does (default "wrap")
//     wrap      continues on the next row, inside the block
//     truncate  is cut at the edge and ends in `…`
//   label: show the language (default true)
//   shade: bg style only, 0..1, how far the background moves from the user message color toward the
//          text color (0 = as dark as a user message; default 0.015)
import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { Markdown, backgroundAnsi, mixColors, truncateToWidth, visibleWidth, wrapTextWithAnsi, type Color } from "@earendil-works/pi-tui";

const THEME_KEY = Symbol.for("@earendil-works/pi-coding-agent:theme");
const ORIGINAL = Symbol.for("code-blocks.renderToken");
const RESET = "\x1b[0m";

type Style = "plain" | "rail" | "rule" | "bg";
type Wrap = "wrap" | "truncate";
type Options = { style: Style; shade: number; label: boolean; wrap: Wrap };
let options: Options = { style: "rail", shade: 0.015, label: true, wrap: "wrap" };

const STYLES: readonly Style[] = ["plain", "rail", "rule", "bg"];
const WRAPS: readonly Wrap[] = ["wrap", "truncate"];

const readOptions = (raw: unknown): Options => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const shade = typeof o.shade === "number" && o.shade >= 0 && o.shade <= 1 ? o.shade : 0.015;
  const style = STYLES.find((v) => v === o.style) ?? "rail";
  return { style, shade, label: o.label !== false, wrap: WRAPS.find((v) => v === o.wrap) ?? "wrap" };
};

const liveTheme = (): Theme | undefined => (globalThis as Record<symbol, Theme | undefined>)[THEME_KEY];

// Keep `bg` under text that resets its own attributes.
const underBg = (s: string, bg: string): string =>
  bg + s.replaceAll(RESET, `${RESET}${bg}`).replaceAll("\x1b[49m", bg);

type Token = { type?: string; lang?: string };

// pi indents each code row by two columns and leaves long rows for the page to wrap, which would put
// the continuation at the left edge, outside the block. Fit rows here so each keeps its prefix.
const rewrap = (body: readonly string[], width: number, prefix: string): string[] => {
  const room = Math.max(1, width - visibleWidth(prefix));
  return body.flatMap((l) => {
    const code = l.startsWith("  ") ? l.slice(2) : l;
    return options.wrap === "truncate" ? [prefix + truncateToWidth(code, room, "…")] : wrapTextWithAnsi(code, room).map((w) => prefix + w);
  });
};

const paint = (lines: string[], token: Token, width: number, theme: Theme): string[] => {
  if (lines.length < 2) return lines;
  // pi's own rows: opening fence, code, closing fence, and a spacer when more content follows.
  const spacer = lines.at(-1) === "" ? [""] : [];
  const body = lines.slice(1, spacer.length ? -2 : -1);
  const lang = options.label ? (token.lang ?? "").trim().split(/\s+/)[0] : "";
  const label = lang ? theme.italic(theme.fg("dim", lang)) : "";
  const edge = (s: string): string => theme.fg("mdCodeBlockBorder", s);

  switch (options.style) {
    case "plain":
      return [...(label ? [`  ${label}`] : []), ...rewrap(body, width, "  "), ...spacer];

    case "rail": {
      // The two-column indent pi puts before each code row becomes the bar.
      return [
        `${edge("╭")} ${label}`.trimEnd(),
        ...rewrap(body, width, `${edge("│")} `),
        edge("╰"),
        ...spacer,
      ];
    }

    case "rule": {
      const span = Math.max(8, Math.min(width, 100));
      const head = label ? ` ${label} ` : "";
      const top = edge("──") + head + edge("─".repeat(Math.max(0, span - 2 - visibleWidth(head))));
      return [top, ...rewrap(body, width, "  "), edge("─".repeat(span)), ...spacer];
    }

    case "bg": {
      const colors = theme.colors as Readonly<Record<string, Color>>;
      const base = colors.userMessageBg;
      const text = colors.text;
      if (!base || !text) return lines;
      const bg = backgroundAnsi(mixColors(base, text, options.shade, "srgb"), theme.getColorMode());
      const row = (x: string): string => {
        const clipped = truncateToWidth(x, width, "");
        return underBg(clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped))), bg) + RESET;
      };
      return [row(label ? `  ${label}` : ""), ...rewrap(body, width, "  ").map(row), row(""), ...spacer];
    }
  }
};

// A table's header row sits between its top border and the `├` separator; paint each cell's text.
const paintTableHeader = (lines: string[], theme: Theme): string[] => {
  const end = lines.findIndex((l) => l.startsWith("├"));
  if (end < 2) return lines;
  return lines.map((line, i) =>
    i >= 1 && i < end
      ? line
          .split("│")
          .map((cell) => (cell.trim() ? theme.fg("mdHeading", cell) : cell))
          .join("│")
      : line,
  );
};

const install = (): void => {
  const proto = Markdown.prototype as unknown as {
    renderToken: (token: Token, width: number, ...rest: unknown[]) => string[];
    [ORIGINAL]?: typeof Markdown.prototype.render;
  };
  if (typeof proto.renderToken !== "function") return;
  // A reload runs this again: wrap the original, never an earlier wrapper.
  const original = (proto[ORIGINAL] as unknown as typeof proto.renderToken | undefined) ?? proto.renderToken;
  proto[ORIGINAL] = original as never;
  proto.renderToken = function (this: unknown, token, width, ...rest) {
    const lines = original.call(this, token, width, ...rest);
    if (!Array.isArray(lines)) return lines;
    const theme = liveTheme();
    if (!theme) return lines;
    if (token?.type === "code") return paint(lines, token, width, theme);
    if (token?.type === "table") return paintTableHeader(lines, theme);
    return lines;
  };
};

export default function (pi: ExtensionAPI) {
  install();
  pi.on("session_start", () => {
    options = readOptions((pi.getSettings() as Record<string, unknown>).codeBlocks);
  });
}

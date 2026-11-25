// /changed: open the files this session edited or wrote in $EDITOR (nvim by default),
// shown as a docked Snacks tree, with a quickfix list for ]q / :cn.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ToolName = "edit" | "write";
type Change = {
  readonly path: string;
  // First changed line of the most recent change; earlier changes' lines may have moved.
  readonly line: number;
  readonly writes: number;
  readonly edits: number;
};

const isTracked = (name: unknown): name is ToolName => name === "edit" || name === "write";

// Edit diffs look like "+31 text" / "-32 text" / " 28 text".
const firstChangedLine = (diff: unknown): number => {
  if (typeof diff !== "string") return 1;
  const m = /^[+-]\s*(\d+)/m.exec(diff);
  return m ? Number(m[1]) : 1;
};

// Resolve symlinks so one file reached through two paths gets one entry.
const canonical = (path: string): string => (existsSync(path) ? realpathSync(path) : path);

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

const describe = (c: Change): string =>
  [c.writes > 0 ? (c.writes === 1 ? "write" : plural(c.writes, "write")) : "", c.edits > 0 ? plural(c.edits, "edit") : ""]
    .filter(Boolean)
    .join(", ");

const collectChanges = (ctx: ExtensionContext): Change[] => {
  const calls = new Map<string, { path: string; tool: ToolName }>();
  // Map keeps first-touch order.
  const byPath = new Map<string, Change>();
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "message") continue;
    const msg = entry.message as any;
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block?.type === "toolCall" && isTracked(block.name) && typeof block.arguments?.path === "string") {
          calls.set(block.id, { path: canonical(resolve(ctx.cwd, block.arguments.path)), tool: block.name });
        }
      }
    } else if (msg.role === "toolResult" && !msg.isError) {
      const call = calls.get(msg.toolCallId);
      if (!call) continue;
      const prev = byPath.get(call.path);
      byPath.set(call.path, {
        path: call.path,
        line: call.tool === "edit" ? firstChangedLine(msg.details?.diff) : 1,
        writes: (prev?.writes ?? 0) + (call.tool === "write" ? 1 : 0),
        edits: (prev?.edits ?? 0) + (call.tool === "edit" ? 1 : 0),
      });
    }
  }
  return [...byPath.values()].filter((c) => existsSync(c.path));
};

// Tree nodes for the sidebar. Folder chains with one child collapse into one node.
type TreeNode = {
  readonly id: number;
  readonly parent?: number;
  readonly last: boolean;
  readonly name: string;
  readonly path?: string;
  readonly line?: number;
  readonly label?: string;
};
type Dir = { dirs: Map<string, Dir>; files: Change[] };

const treeNodes = (changes: readonly Change[]): TreeNode[] => {
  const home = homedir();
  const root: Dir = { dirs: new Map(), files: [] };
  for (const c of changes) {
    const shown = c.path.startsWith(home + "/") ? "~" + c.path.slice(home.length) : c.path;
    const segments = shown.split("/").slice(0, -1);
    let node = root;
    for (const seg of segments) {
      let next = node.dirs.get(seg);
      if (!next) node.dirs.set(seg, (next = { dirs: new Map(), files: [] }));
      node = next;
    }
    node.files.push(c);
  }
  const nodes: TreeNode[] = [];
  const walk = (dir: Dir, parent: number | undefined) => {
    const subdirs = [...dir.dirs].sort(([a], [b]) => a.localeCompare(b));
    const files = [...dir.files].sort((a, b) => basename(a.path).localeCompare(basename(b.path)));
    const total = subdirs.length + files.length;
    let index = 0;
    for (const [name, child] of subdirs) {
      let label = name;
      let target = child;
      while (target.files.length === 0 && target.dirs.size === 1) {
        const [[nextName, nextDir]] = [...target.dirs];
        label = `${label}/${nextName}`;
        target = nextDir;
      }
      const id = nodes.length;
      nodes.push({ id, parent, last: ++index === total, name: `${label || ""}/` });
      walk(target, id);
    }
    for (const f of files) {
      nodes.push({
        id: nodes.length,
        parent,
        last: ++index === total,
        name: basename(f.path),
        path: f.path,
        line: f.line,
        label: describe(f),
      });
    }
  };
  walk(root, undefined);
  return nodes;
};

// Loaded with nvim -S. A docked Snacks picker shows the tree; the quickfix list holds
// the same files for ]q / :cn.
const NVIM_SCRIPT = `
local nodes = vim.json.decode(table.concat(vim.fn.readfile(vim.g.pi_changed_data), "\\n"))
local items, qf = {}, {}
for _, n in ipairs(nodes) do
  local item = { text = n.name, name = n.name, label = n.label, last = n.last }
  if n.parent then item.parent = items[n.parent + 1] end
  if n.path then
    item.file = n.path
    item.pos = { n.line, 0 }
    table.insert(qf, { filename = n.path, lnum = n.line, col = 1, text = n.name .. "  " .. n.label })
  else
    item.dir = true
  end
  items[#items + 1] = item
end
vim.fn.setqflist({}, " ", { title = "pi changes", items = qf })

local function tree()
  Snacks.picker.pick({
    title = "pi changes",
    items = items,
    focus = "list",
    auto_close = false,
    jump = { close = false },
    layout = { preset = "sidebar", preview = false, hidden = { "input" } },
    matcher = { sort_empty = false, fuzzy = false },
    format = function(item, picker)
      local ret = Snacks.picker.format.tree(item, picker)
      if item.dir then
        ret[#ret + 1] = { item.name, "Directory" }
      else
        local icon, hl = Snacks.util.icon(item.name, "file")
        ret[#ret + 1] = { icon .. " ", hl }
        ret[#ret + 1] = { item.name }
        ret[#ret + 1] = { "  " .. item.label, "Comment" }
      end
      return ret
    end,
    confirm = function(picker, item, action)
      if item and not item.dir then Snacks.picker.actions.jump(picker, item, action) end
    end,
  })
end
vim.api.nvim_create_user_command("PiChanged", tree, { desc = "Files changed in the pi session" })
vim.keymap.set("n", "<leader>tc", tree, { desc = "pi changed files" })

vim.cmd("cfirst")
vim.schedule(tree)
`;

const editorCommand = (changes: readonly Change[], dir: string): [string, string[]] => {
  const editor = process.env.PI_CHANGED_EDITOR ?? process.env.EDITOR ?? "nvim";
  if (!/(^|\/)n?vim?$/.test(editor)) return [editor, changes.map((c) => c.path)];
  const dataFile = join(dir, "changes.json");
  const scriptFile = join(dir, "changed.lua");
  writeFileSync(dataFile, JSON.stringify(treeNodes(changes)));
  writeFileSync(scriptFile, NVIM_SCRIPT);
  return [editor, ["--cmd", `let g:pi_changed_data = ${JSON.stringify(dataFile)}`, "-S", scriptFile]];
};

export default function (pi: ExtensionAPI) {
  pi.registerCommand("changed", {
    description: "Open files changed in this session in $EDITOR (sidebar tree in nvim)",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") return;
      if (!ctx.isIdle()) {
        ctx.ui.notify("Agent is busy; try /changed when it's idle", "warning");
        return;
      }
      const changes = collectChanges(ctx);
      if (changes.length === 0) {
        ctx.ui.notify("No files changed in this session", "info");
        return;
      }

      const dir = mkdtempSync(join(tmpdir(), "pi-changed-"));
      const [cmd, args] = editorCommand(changes, dir);

      try {
        await ctx.ui.custom<void>((tui, _theme, _kb, done) => {
          tui.stop();
          // bash -m runs the editor in its own foreground process group, so the terminal (and
          // Rex's editor-aware Ctrl+h/j/k/l) sees the editor rather than pi.
          const child = spawn("bash", ["-m", "-c", '"$@"; exit $?', "bash", cmd, ...args], {
            stdio: "inherit",
            cwd: ctx.cwd,
          });
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            tui.start();
            tui.requestRender(true);
            done();
          };
          child.on("exit", finish);
          child.on("error", (err) => {
            finish();
            ctx.ui.notify(`Failed to launch ${cmd}: ${err.message}`, "error");
          });
          return { render: () => [], invalidate: () => {} };
        });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  });
}

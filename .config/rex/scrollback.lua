-- Read-only scrollback viewer; loaded by Rex instead of the normal Neovim config.
vim.opt.swapfile = false
vim.opt.shadafile = "NONE"
vim.opt.clipboard = "unnamedplus"
vim.opt.termguicolors = true
vim.opt.wrap = false
vim.opt.number = false
vim.opt.relativenumber = false
vim.opt.mouse = "a"
vim.opt.laststatus = 2
vim.opt.statusline = " Scrollback   v select   Ctrl+V rectangle   y copy   / search   q close"
vim.api.nvim_set_hl(0, "Normal", { fg = "#cdd6f4", bg = "#1e1e2e" })
vim.api.nvim_set_hl(0, "Visual", { bg = "#45475a" })
vim.api.nvim_set_hl(0, "StatusLine", { fg = "#fab387", bg = "#181825" })
vim.keymap.set("n", "q", "<Cmd>qa!<CR>", { silent = true })
vim.keymap.set("x", "y", '"+y<Cmd>qa!<CR>', { silent = true })

vim.api.nvim_create_autocmd("VimLeavePre", {
  callback = function()
    if (vim.g.rex_scrollback_zoom or "") == "" then return end
    vim.fn.system({ vim.env.REX_BIN_DIR .. "/rex", "api", "call", "session.zoom_block",
      vim.json.encode({ session_id = vim.env.REX_SESSION,
        block_id = vim.g.rex_scrollback_zoom, zoom = true }) })
  end,
})

vim.api.nvim_create_autocmd("BufReadPost", {
  once = true,
  callback = function(event)
    -- Keep the snapshot only in memory once loaded; no swap or history files.
    vim.fn.delete(vim.api.nvim_buf_get_name(event.buf))
    vim.bo[event.buf].buftype = "nofile"
    vim.bo[event.buf].bufhidden = "wipe"
    vim.bo[event.buf].readonly = true
    vim.bo[event.buf].modifiable = false
    vim.cmd("normal! G")
  end,
})

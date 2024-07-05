-- remap bindings here
vim.g.mapleader = " "
vim.keymap.set("n", "<leader>pv", vim.cmd.Ex)

vim.keymap.set("v", "J", ":m '>+1<CR>gv=gv")
vim.keymap.set("v", "K", ":m '<-2<CR>gv=gv")

vim.keymap.set("n", "<leader>y", "\"+y")
vim.keymap.set("v", "<leader>y", "\"+y")
vim.keymap.set("n", "<leader>Y", "\"+Y")

vim.keymap.set("n", "<leader>cfp", function ()
    local filepath = vim.fn.expand('%:p')
    vim.fn.setreg('+', filepath) -- write to clippoard
    print(string.format("Copied filepath:%s to clipboard!", filepath))
end)

vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")

vim.keymap.set("n", "n", "nzzzv")
vim.keymap.set("n", "N", "Nzzzv")

vim.keymap.set("x", "<leader>p", "\"_dP")

vim.keymap.set("n", "Q", "<nop>")

-- following maps to < and > making window wider or thinner respectively
vim.keymap.set("n", "<C-W>,", function ()
    local win = vim.api.nvim_get_current_win()
    local winWidth = vim.api.nvim_win_get_width(win)
    local resizeFactor = -15
    vim.api.nvim_win_set_width(win, winWidth + resizeFactor)
end)
vim.keymap.set("n", "<C-W>.", function ()
    local win = vim.api.nvim_get_current_win()
    local winWidth = vim.api.nvim_win_get_width(win)
    local resizeFactor = 15
    vim.api.nvim_win_set_width(win, winWidth + resizeFactor)
end)
vim.keymap.set("n", "<C-W><", function ()
    local win = vim.api.nvim_get_current_win()
    local winWidth = vim.api.nvim_win_get_width(win)
    local resizeFactor = -45
    vim.api.nvim_win_set_width(win, winWidth + resizeFactor)
end)
vim.keymap.set("n", "<C-W>>", function ()
    local win = vim.api.nvim_get_current_win()
    local winWidth = vim.api.nvim_win_get_width(win)
    local resizeFactor = 45
    vim.api.nvim_win_set_width(win, winWidth + resizeFactor)
end)

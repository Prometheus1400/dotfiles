vim.opt.nu = true
vim.opt.relativenumber = true
vim.opt.tabstop = 4
vim.opt.softtabstop = 4
vim.opt.shiftwidth = 4
vim.opt.expandtab = true
vim.opt.smartindent = true
vim.opt.swapfile = false
vim.opt.termguicolors = true
vim.opt.ignorecase = true

vim.api.nvim_create_autocmd('TextYankPost', {
    desc = 'Highlight when yanking text',
    group = vim.api.nvim_create_augroup('highlight-yank', { clear = true }),
    callback = function()
        vim.highlight.on_yank()
    end
})

-- Enable persistent undo
vim.opt.undofile = true
-- Set the undo directory
vim.opt.undodir = vim.fn.expand("~/.local/share/nvim/undo")

-- Enable autoread when files are changed outside of Neovim
vim.opt.autoread = true
-- -- Create an augroup for auto-reloading
-- vim.api.nvim_create_augroup('AutoReload', { clear = true })
-- -- Check for file changes when Neovim gains focus or when a buffer is entered
-- vim.api.nvim_create_autocmd({ "CursorHold" }, {
--     group = 'AutoReload',
--     command = "checktime"
-- })

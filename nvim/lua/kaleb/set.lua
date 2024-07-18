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

-- -- makes * and # work on visual mode too.
-- vim.api.nvim_exec(
--     [[
--   function! g:VSetSearch(cmdtype)
--     let temp = @s
--     norm! gv"sy
--     let @/ = '\V' . substitute(escape(@s, a:cmdtype.'\'), '\n', '\\n', 'g')
--     let @s = temp
--   endfunction

--   xnoremap / :<C-u>call g:VSetSearch('/')<CR>/<C-R>=@/<CR><CR>
--   xnoremap ? :<C-u>call g:VSetSearch('?')<CR>?<C-R>=@/<CR><CR>
-- ]],
--     false
-- )

-- Enable autoread when files are changed outside of Neovim
vim.opt.autoread = true
-- -- Create an augroup for auto-reloading
-- vim.api.nvim_create_augroup('AutoReload', { clear = true })
-- -- Check for file changes when Neovim gains focus or when a buffer is entered
-- vim.api.nvim_create_autocmd({ "CursorHold" }, {
--     group = 'AutoReload',
--     command = "checktime"
-- })

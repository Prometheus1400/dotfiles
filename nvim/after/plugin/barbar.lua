-- require("barbar").setup()

-- vim.keymap.set("n", "<leader>bc", vim.cmd.BufferClose)
-- vim.keymap.set("n", "<A-,>,", vim.cmd.BufferPrevious)
-- vim.keymap.set("n", "<A-.>.", vim.cmd.BufferNext)
local map = vim.api.nvim_set_keymap
local opts = { noremap = true, silent = true }

-- Move to previous/next
map('n', '<A-,>', '<Cmd>BufferPrevious<CR>', opts)
map('n', '<A-.>', '<Cmd>BufferNext<CR>', opts)
-- Re-order to previous/next
map('n', '<A-<>', '<Cmd>BufferMovePrevious<CR>', opts)
map('n', '<A->>', '<Cmd>BufferMoveNext<CR>', opts)
-- Goto buffer in position...
map('n', '<A-1>', '<Cmd>BufferGoto 1<CR>', opts)
map('n', '<A-2>', '<Cmd>BufferGoto 2<CR>', opts)
map('n', '<A-3>', '<Cmd>BufferGoto 3<CR>', opts)
map('n', '<A-4>', '<Cmd>BufferGoto 4<CR>', opts)
map('n', '<A-5>', '<Cmd>BufferGoto 5<CR>', opts)
map('n', '<A-6>', '<Cmd>BufferGoto 6<CR>', opts)
map('n', '<A-7>', '<Cmd>BufferGoto 7<CR>', opts)
map('n', '<A-8>', '<Cmd>BufferGoto 8<CR>', opts)
map('n', '<A-9>', '<Cmd>BufferGoto 9<CR>', opts)
map('n', '<A-0>', '<Cmd>BufferLast<CR>', opts)
-- Pin/unpin buffer
map('n', '<A-p>', '<Cmd>BufferPin<CR>', opts)
-- Close buffer
map('n', '<A-c>', '<Cmd>BufferClose<CR>', opts)
map('n', '<A-x>', '<Cmd>BufferCloseAllButCurrentOrPinned<CR>', opts)
-- Magic buffer-picking mode
map('n', '<leader><leader>b', '<Cmd>BufferPick<CR>', opts)

vim.g.barbar_auto_setup = false -- disable auto-setup
-- require 'barbar'.setup {
--     animation = true,
--     auto_hide = 1,

--     icons = {
--         buffer_index = false,
--         button = '',
--         diagnostics = {
--             [vim.diagnostic.severity.ERROR] = { enabled = true, icon = '!' },
--             [vim.diagnostic.severity.WARN] = { enabled = true, icon = '?' },
--             -- [vim.diagnostic.severity.INFO] = { enabled = false },
--             -- [vim.diagnostic.severity.HINT] = { enabled = true },
--         },
--         gitsigns = {
--             added = { enabled = true, icon = '+' },
--             changed = { enabled = true, icon = '~' },
--             deleted = { enabled = true, icon = '-' },
--         },
--         filetype = {
--             custom_colors = false,
--             enabled = true,
--         },
--         separator = { left = '▎', right = '' },
--         -- separator_at_end = true,
--         modified = { button = '●' },
--         pinned = { button = '', filename = true },

--         preset = 'default',

--         -- alternate = { filetype = { enabled = false } },
--         -- current = { buffer_index = true },
--         -- inactive = { button = '×' },
--         -- visible = { modified = { buffer_number = false } },
--     },
--     sidebar_filetypes = {
--         NvimTree = true,
--     },
--     semantic_letters = true,
--     letters = 'asdfjkl;ghnmxcvbziowerutyqpASDFJKLGHNMXCVBZIOWERUTYQP',
-- }

-- Function to get a highlight group's attribute
-- local function get_hl_attr(group, attr)
--   return vim.fn.synIDattr(vim.fn.synIDtrans(vim.fn.hlID(group)), attr)
-- end

-- -- Get the foreground color of the 'Normal' highlight group
-- -- local normal_fg = get_hl_attr('Normal', 'fg')

-- vim.cmd('highlight BufferTabpageFill guibg=NONE')
-- vim.cmd(string.format('highlight BufferCurrentERROR guibg=NONE guifg=%s', get_hl_attr('BufferInactiveERROR', 'fg')))
-- vim.cmd(string.format('highlight BufferCurrentWARN guibg=NONE guifg=%s', get_hl_attr('BufferInactiveWARN', 'fg')))
-- vim.cmd(string.format('highlight BufferCurrentADDED guibg=NONE guifg=%s', get_hl_attr('BufferInactiveADDED', 'fg')))
-- vim.cmd(string.format('highlight BufferCurrentCHANGED guibg=NONE guifg=%s', get_hl_attr('BufferInactiveCHANGED', 'fg')))
-- vim.cmd(string.format('highlight BufferCurrentDELETED guibg=NONE guifg=%s', get_hl_attr('BufferInactiveDELETED', 'fg')))

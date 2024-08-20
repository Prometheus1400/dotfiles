local builtin = require('telescope.builtin')
vim.keymap.set('n', '<leader>ff', builtin.find_files, {})
vim.keymap.set('n', '<leader>fg', builtin.git_files, {})
vim.keymap.set('n', '<leader>fb', builtin.buffers, {})
vim.keymap.set('n', '<leader>fib', builtin.current_buffer_fuzzy_find, {})
vim.keymap.set('n', '<leader>fh', builtin.help_tags, {})
vim.keymap.set('n', '<leader>fd', builtin.diagnostics, {})
vim.keymap.set('n', '<leader>gb', builtin.git_branches, {})
-- keymap to search files for some string
vim.keymap.set('n', '<leader>fs', builtin.live_grep, {})
-- vim.keymap.set('n', '<leader>fs', function()
--     builtin.grep_string({ search = vim.fn.input("Grep: ") });
-- end)

-- kemap to search buffer for methods or functions
vim.keymap.set('n', '<leader>fm', function()
    builtin.lsp_document_symbols({
        symbols = { 'function', 'method' },
        symbol_width = 0,
        show_line = true,
        symbol_highlights = { 'function', 'method' }
    })
end, {})

local actions = require('telescope.actions')
local telescope = require('telescope')
telescope.setup({
    defaults = {
        mappings = {
            i = {
                ["<esc>"] = actions.close,
                -- ["<CR>"] = actions.select_vertical,
                ["<Tab>"] = actions.toggle_selection + actions.move_selection_worse,
                ["<S-Tab>"] = actions.toggle_selection + actions.move_selection_better,
                ["<C-k>"] = actions.toggle_selection + actions.move_selection_worse,
                ["<C-j>"] = actions.toggle_selection + actions.move_selection_better,
            }
        }
    },
})

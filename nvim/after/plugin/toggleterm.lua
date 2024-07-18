local toggleterm = require('toggleterm')
local Terminal = require('toggleterm.terminal').Terminal
local lazygit  = Terminal:new({
    cmd = "lazygit",
    display_name = "lazygit",
    hidden = false,
    direction = "float",
    float_opts = {
        border = "curved",
    },
})
local normal_term = Terminal:new({
    display_name = "terminal",
    hidden = false,
    direction = "float",
    float_opts = {
        border = "curved",
    },
})

vim.keymap.set("n", "<leader>sg", function()
    lazygit:toggle()
end, { noremap = true, silent = true })
vim.keymap.set("n", "<leader>st", function()
    normal_term:toggle()
end, { noremap = true, silent = true })

function _G.set_terminal_keymaps()
    local opts = { buffer = 0 }
    -- vim.keymap.set('t', '<esc><esc>', function()
    vim.keymap.set('t', 'qq', function()
        toggleterm.toggle()
    end, opts)
end

vim.cmd('autocmd! TermOpen term://*toggleterm#* lua set_terminal_keymaps()')
require("toggleterm").setup()

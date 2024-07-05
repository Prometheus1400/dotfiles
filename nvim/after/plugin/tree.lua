require("nvim-tree").setup({
    sort = {
        sorter = "case_sensitive",
    },
    view = {
        adaptive_size = true,
    },
    renderer = {
        group_empty = true,
    },
    filters = {
        -- dotfiles = true,
    },
    actions = {
        open_file = {
            quit_on_open = true,
        },
    },
})

vim.keymap.set("n", "<leader>tf", vim.cmd.NvimTreeFindFile)
vim.keymap.set("n", "<leader>tt", vim.cmd.NvimTreeToggle)

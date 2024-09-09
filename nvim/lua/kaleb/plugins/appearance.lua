local python_venv = function()
    local venv = vim.env.VIRTUAL_ENV -- or vim.env.CONDA_DEFAULT_ENV
    if venv then
        return string.format("🐍 %s", vim.fn.fnamemodify(venv, ":h:t"))
    else
        return ""
    end
end

return {
    { "brenoprata10/nvim-highlight-colors",      event = "BufReadPre" }, -- highlights hex colors
    { "nvim-treesitter/nvim-treesitter-context", event = "BufReadPre" }, -- pin nested function or class at top
    {
        "catppuccin/nvim",
        name = "catppuccin",
        lazy = false,
        priority = 1000,
        config = function()
            require('catppuccin').setup({
                transparent_background = true
            })
            vim.cmd('colorscheme catppuccin-mocha')
        end
    },
    {
        "nvim-lualine/lualine.nvim",
        dependencies = { "catppuccin/nvim" },
        opts = {
            options = {
                theme = "catppuccin-mocha"
            },
            sections = {
                lualine_a = { 'mode' },
                lualine_b = { 'branch', 'diff', 'diagnostics' },
                lualine_c = { 'filename' },
                lualine_x = { 'encoding', 'fileformat', 'filetype', python_venv },
                lualine_y = { 'progress' },
                lualine_z = { 'location' }
            },
        }
    },                              -- pretty status line on bottom
    {
        "folke/todo-comments.nvim", -- highlights 'TODO:' comments
        event = "BufReadPre",
        dependencies = "nvim-lua/plenary.nvim",
        config = function()
            require("todo-comments").setup({})
        end
    },
    {
        "utilyre/barbecue.nvim",
        name = "barbecue",
        event = "BufReadPre",
        version = "*",
        dependencies = {
            "SmiteshP/nvim-navic",
            "nvim-tree/nvim-web-devicons", -- optional dependency
        },
        opts = {},
    }
}

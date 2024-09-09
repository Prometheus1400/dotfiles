return {
    {
        "nvim-treesitter/nvim-treesitter",
        -- build = ":TSUpdate",
        event = "BufReadPre",
        config = function()
            require 'nvim-treesitter.configs'.setup {
                -- A list of parser names, or "all" (the five listed parsers should always be installed)
                ensure_installed = { "lua", "vim", "vimdoc", "query", "java", "go", "python", "bash", "yaml" },
                ignore_install = {},
                modules = {},
                -- Install parsers synchronously (only applied to `ensure_installed`)
                sync_install = false,

                -- Automatically install missing parsers when entering buffer
                -- Recommendation: set to false if you don't have `tree-sitter` CLI installed locally
                auto_install = true,

                ---- If you need to change the installation directory of the parsers (see -> Advanced Setup)
                -- parser_install_dir = "/some/path/to/store/parsers", -- Remember to run vim.opt.runtimepath:append("/some/path/to/store/parsers")!

                highlight = {
                    enable = true,
                    -- Setting this to true will run `:h syntax` and tree-sitter at the same time.
                    -- Set this to `true` if you depend on 'syntax' being enabled (like for indentation).
                    -- Using this option may slow down your editor, and you may see some duplicate highlights.
                    -- Instead of true it can also be a list of languages
                    additional_vim_regex_highlighting = false,
                },
            }
            vim.treesitter.language.register("bash", "sh")
            vim.treesitter.language.register("bash", "zsh")
            vim.treesitter.language.register("conf", "toml")
            vim.filetype.add { extension = { ebnf = 'ebnf' } }
            vim.filetype.add { extension = { conf = 'toml' } }
        end
    },
    {
        "mbbill/undotree",
        keys = {
            { '<leader>u', vim.cmd.UndotreeToggle, 'n' }
        }
    },
    {
        "lukas-reineke/indent-blankline.nvim",
        name = "ibl",
        opts = {
            scope = {
                enabled = false,
                show_start = false,
                show_end = false,
            },
            indent = {
                -- highlight = highlight,
                char = "│",
            },
            enabled = true
        }
    },                                                                                                             -- nice indent lines
    { "christoomey/vim-tmux-navigator" },                                                                          -- for seamless navigation across tmux and nvim
    { 'numToStr/Comment.nvim',         event = "BufReadPre", config = function() require('Comment').setup() end }, -- better comment commands
    {
        "nvim-tree/nvim-tree.lua",
        lazy = false,
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
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
        end
    },
    { "windwp/nvim-autopairs",  event = "BufReadPre",  config = function() require("nvim-autopairs").setup({}) end },          -- better parenthesis and bracket completion similar to vscode or intellij
    { "kylechui/nvim-surround", event = "BufReadPre",  version = "*",                                              opts = {} }, -- make keybinds for surrounding/deleting surrounds feel native
    { "folke/trouble.nvim",     opts = {} },                                                                                   -- work with diagnostics better
}

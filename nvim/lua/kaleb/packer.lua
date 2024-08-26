vim.cmd [[packadd packer.nvim]]

return require("packer").startup(function(use)
    -- BEGIN ESSENTIALS
    use "wbthomason/packer.nvim"
    use { "nvim-telescope/telescope.nvim", tag = "0.1.8", requires = { { "nvim-lua/plenary.nvim" } } }
    use("nvim-treesitter/nvim-treesitter", { run = ":TSUpdate" })
    -- lsp stuff
    use "williamboman/mason.nvim"
    use "williamboman/mason-lspconfig.nvim"
    use "nvimtools/none-ls.nvim"
    use "L3MON4D3/LuaSnip"
    use "neovim/nvim-lspconfig"
    use "hrsh7th/nvim-cmp"
    use "hrsh7th/cmp-nvim-lsp"
    use "hrsh7th/cmp-buffer"
    use "hrsh7th/cmp-path"
    use "hrsh7th/cmp-cmdline"
    use "hrsh7th/cmp-nvim-lsp-signature-help"
    use "mbbill/undotree"                                                                                    -- undotree
    use "tpope/vim-commentary"                                                                               -- better comment commands
    use "nvim-lualine/lualine.nvim"                                                                          -- pretty status line on bottom
    use { "nvim-tree/nvim-tree.lua", requires = { "nvim-tree/nvim-web-devicons" } }                          -- file tree
    use { "windwp/nvim-autopairs", config = function() require("nvim-autopairs").setup({}) end }             -- better parenthesis and bracket completion similar to vscode or intellij
    use({ "kylechui/nvim-surround", tag = "*", config = function() require("nvim-surround").setup({}) end }) -- make keybinds for surrounding/deleting surrounds feel native
    use { "folke/trouble.nvim", config = function() require("trouble").setup({}) end }                       -- work with diagnostics better
    use "lukas-reineke/indent-blankline.nvim"                                                                -- nice indent lines
    use "christoomey/vim-tmux-navigator"                                                                     -- for seamless navigation across tmux and nvim
    -- END ESSENTIALS

    -- THEMES
    use { "catppuccin/nvim", as = "catppuccin", }
    use "navarasu/onedark.nvim"
    use { "rose-pine/neovim", as = "rose-pine", }
    use { 'fcancelinha/nordern.nvim', as = "nordern" }
    use "folke/tokyonight.nvim"

    -- GIT STUFF
    use "tpope/vim-fugitive"
    use "lewis6991/gitsigns.nvim"                                      -- for git status in buffer
    use { "ruifm/gitlinker.nvim", requires = "nvim-lua/plenary.nvim" } -- for copying git link to line in buffer
    use { "NeogitOrg/neogit", requires = { "nvim-lua/plenary.nvim", "sindrets/diffview.nvim" } }

    -- DATABASE STUFF
    use {
        'kristijanhusak/vim-dadbod-ui',
        requires = {
            { 'tpope/vim-dadbod',                     lazy = true },
            { 'kristijanhusak/vim-dadbod-completion', ft = { 'sql', 'mysql', 'plsql' }, lazy = true },
        }
    }

    -- OTHER
    use "akinsho/toggleterm.nvim"                 -- popup terminal used for terminal and lazygit
    use "nvim-treesitter/playground"              -- can see the AST for treesitter
    use "brenoprata10/nvim-highlight-colors"      -- highlights hex colors
    use "nvim-treesitter/nvim-treesitter-context" -- pin nested function or class at top
    use {
        "folke/todo-comments.nvim",               -- highlights 'TODO:' comments
        requires = "nvim-lua/plenary.nvim",
        config = function()
            require("todo-comments").setup({})
        end
    }
    use { "j-hui/fidget.nvim", config = function() require("fidget").setup({}) end }                  -- lsp progress messages
    use { "barrett-ruth/live-server.nvim", config = function() require('live-server').setup({}) end } -- live server for serving html

    -- markdown stuff
    use({
        'MeanderingProgrammer/render-markdown.nvim', -- great in buffer snytax highlighting and rendering for markdown
        after = { 'nvim-treesitter' },
        requires = { 'nvim-tree/nvim-web-devicons', opt = true },
        config = function()
            require('render-markdown').setup({})
        end,
    })

    -- DEBUGGER
    use { "rcarriga/nvim-dap-ui", requires = { "mfussenegger/nvim-dap", "nvim-neotest/nvim-nio" } }
    use "theHamsta/nvim-dap-virtual-text"

    --  NEOVIM DEVELOPMENT
    use "folke/neodev.nvim"

    -- LOCAL PLUGINS
    -- use "/Users/kaleb/Desktop/tests/ollama-pilot.nvim"
    -- use "/Users/kaleb/Desktop/tests/nvim-lens.nvim"

    -- LANGUAGE SPECIFIC PLUGINS
    -- PYTHON
    use "mfussenegger/nvim-dap-python" -- debugger
    -- JAVA
    use "mfussenegger/nvim-jdtls"
end)

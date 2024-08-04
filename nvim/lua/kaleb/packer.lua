vim.cmd [[packadd packer.nvim]]

return require("packer").startup(function(use)
    -- ESSENTIALS
    use "wbthomason/packer.nvim"
    use {
        "nvim-telescope/telescope.nvim", tag = "0.1.8",
        requires = { { "nvim-lua/plenary.nvim" } }
    }
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
    use "mbbill/undotree"
    use "tpope/vim-commentary"
    use {
        "nvim-tree/nvim-tree.lua",
        requires = { { "nvim-tree/nvim-web-devicons" } }
    }

    -- THEMES
    use { "catppuccin/nvim", as = "catppuccin", }
    use "navarasu/onedark.nvim"
    use { "rose-pine/neovim", as = "rose-pine", }

    -- GIT STUFF
    use "tpope/vim-fugitive"
    use "lewis6991/gitsigns.nvim" -- OPTIONAL: for git status
    use {
        "ruifm/gitlinker.nvim",
        requires = "nvim-lua/plenary.nvim",
    }
    use {
        "NeogitOrg/neogit",
        requires = {
            "nvim-lua/plenary.nvim",
            "sindrets/diffview.nvim",
            "nvim-telescope/telescope.nvim"
        }
    }

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
    use "nvim-lualine/lualine.nvim"               -- pretty status line on bottom
    use "brenoprata10/nvim-highlight-colors"      -- highlights hex colors
    use "lukas-reineke/indent-blankline.nvim"     -- helps when indent is important
    use "nvim-treesitter/nvim-treesitter-context" -- pin nested function or class at top
    use {
        "folke/todo-comments.nvim",               -- highlights 'TODO:' comments
        requires = "nvim-lua/plenary.nvim"
    }
    use "christoomey/vim-tmux-navigator" -- for seamless navigation across tmux and nvim
    use "j-hui/fidget.nvim" -- lsp progress messages
    use "tpope/vim-surround"
    use "barrett-ruth/live-server.nvim"
    use "luckasRanarison/tailwind-tools.nvim"
    -- use "romgrk/barbar.nvim" -- TABS: still working out if I like this or not

    -- markdown stuff
    use { "ellisonleao/glow.nvim", config = function() require("glow").setup() end }
    use { "lukas-reineke/headlines.nvim", after = "nvim-treesitter", config = function() require("headlines").setup() end }

    -- DEBUGGER
    use { "rcarriga/nvim-dap-ui", requires = { "mfussenegger/nvim-dap", "nvim-neotest/nvim-nio" } }
    use "theHamsta/nvim-dap-virtual-text"

    --  NEOVIM DEVELOPMENT
    use "folke/neodev.nvim"
    use "/Users/kaleb/Desktop/tests/ollama-pilot.nvim"
    use "/Users/kaleb/Desktop/tests/nvim-lens.nvim"

    -- LANGUAGE SPECIFIC PLUGINS
    -- PYTHON
    use "mfussenegger/nvim-dap-python" -- debugger
    --
    -- GO
    -- use "ray-x/go.nvim"
    -- use "ray-x/guihua.lua"
    -- JAVA
    use "mfussenegger/nvim-jdtls"
end)

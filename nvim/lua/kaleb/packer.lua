vim.cmd [[packadd packer.nvim]]

return require("packer").startup(function(use)
    -- ESSENTIALS
    use "wbthomason/packer.nvim"
    use {
        "nvim-telescope/telescope.nvim", tag = "0.1.8",
        requires = { { "nvim-lua/plenary.nvim" } }
    }
    use("nvim-treesitter/nvim-treesitter", { run = ":TSUpdate" })
    use {
        "VonHeikemen/lsp-zero.nvim",
        branch = "v3.x",
        requires = {
            --- Uncomment the two plugins below if you want to manage the language servers from neovim
            { "williamboman/mason.nvim" },
            { "williamboman/mason-lspconfig.nvim" },
            { "nvimtools/none-ls.nvim" },
            { "L3MON4D3/LuaSnip" },
            { "neovim/nvim-lspconfig" },
            { "hrsh7th/nvim-cmp" },
            { "hrsh7th/cmp-nvim-lsp" },
            { "hrsh7th/cmp-buffer" },
            { "hrsh7th/cmp-path" },
            { "hrsh7th/cmp-cmdline" },
            { "hrsh7th/cmp-nvim-lsp-signature-help" },
        }
    }
    use "mbbill/undotree"
    use "tpope/vim-commentary"
    use {
        "nvim-tree/nvim-tree.lua",
        requires = { { "nvim-tree/nvim-web-devicons" } }
    }

    -- THEMES
    use { "catppuccin/nvim", as = "catppuccin", }
    use "EdenEast/nightfox.nvim"
    use "navarasu/onedark.nvim"
    use "AlexvZyl/nordic.nvim"
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
    use "j-hui/fidget.nvim"

    -- markdown stuff
    use { "ellisonleao/glow.nvim", config = function() require("glow").setup() end }
    use { "lukas-reineke/headlines.nvim", after = "nvim-treesitter", config = function() require("headlines").setup() end }

    -- use "romgrk/barbar.nvim" -- TABS: still working out if I like this or not

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

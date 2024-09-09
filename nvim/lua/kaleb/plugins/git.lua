return {
    { "tpope/vim-fugitive" },
    { "lewis6991/gitsigns.nvim" },                                        -- for git status in buffer
    { "ruifm/gitlinker.nvim",   dependencies = "nvim-lua/plenary.nvim" }, -- for copying git link to line in buffer
    {
        "NeogitOrg/neogit",
        keys = { { "<leader>gs", function() require('neogit').open() end, "n" } },
        dependencies = { "nvim-lua/plenary.nvim", "sindrets/diffview.nvim" },
        config = function()
            local neogit = require("neogit")
            neogit.setup({
                kind = "vsplit"
            })
        end
    },
}

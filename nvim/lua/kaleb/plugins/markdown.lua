return {
    {
        'MeanderingProgrammer/render-markdown.nvim', -- great in buffer snytax highlighting and rendering for markdown
        dependencies = { 'nvim-treesitter/nvim-treesitter', 'nvim-tree/nvim-web-devicons', opt = true },
        ft = "markdown",
        config = function()
            require('render-markdown').setup({})
        end,
    }
}

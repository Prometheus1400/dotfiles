require('nvim-highlight-colors').setup({})

require("catppuccin").setup {
    transparent_background = true,
    -- dim_inactive = {
    --     enabled = true,   -- dims the background color of inactive window
    --     shade = "dark",
    --     percentage = 0, -- percentage of the shade to apply to the inactive window
    -- },
}

require("tokyonight").setup({
    -- style = "night",
    transparent = true,
    -- lualine_bold = true,
    -- dim_inactive = false
})

require('onedark').setup {
    -- Main options --
    style = 'darker',             -- Default theme style. Choose between 'dark', 'darker', 'cool', 'deep', 'warm', 'warmer' and 'light'
    transparent = true,           -- Show/hide background
    term_colors = true,           -- Change terminal color as per the selected theme style
    ending_tildes = false,        -- Show the end-of-buffer tildes. By default they are hidden
    cmp_itemkind_reverse = false, -- reverse item kind highlights in cmp menu

    -- Change code style ---
    -- Options are italic, bold, underline, none
    -- You can configure multiple style with comma separated, For e.g., keywords = 'italic,bold'
    code_style = {
        comments = 'italic',
        keywords = 'bold',
        functions = 'none',
        strings = 'none',
        variables = 'none',
        types = 'italic,bold',
    },

    -- Lualine options --
    lualine = {
        transparent = true, -- lualine center bar transparency
    },

    -- Custom Highlights --
    colors = {},     -- Override default colors
    highlights = {}, -- Override highlight groups

    -- Plugins Config --
    diagnostics = {
        darker = true,     -- darker colors for diagnostic
        undercurl = true,  -- use undercurl instead of underline for diagnostics
        background = true, -- use background color for virtual text
    },
}

require("rose-pine").setup({
    variant = "auto",      -- auto, main, moon, or dawn
    dark_variant = "moon", -- main, moon, or dawn
    dim_inactive_windows = false,
    extend_background_behind_borders = true,

    enable = {
        terminal = true,
        legacy_highlights = true, -- Improve compatibility for previous versions of Neovim
        migrations = true,        -- Handle deprecated options automatically
    },

    styles = {
        bold = true,
        italic = true,
        transparency = true,
    },
})

-- vim.cmd('colorscheme tokyonight-night')
vim.cmd('colorscheme catppuccin-mocha')
-- vim.cmd('colorscheme nordern')
-- vim.cmd("colorscheme onedark")
-- vim.cmd("colorscheme rose-pine")

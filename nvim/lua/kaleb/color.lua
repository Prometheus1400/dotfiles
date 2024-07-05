require('nvim-highlight-colors').setup({})

require("catppuccin").setup { transparent_background = true }

require("nightfox").setup({
    options = {
        styles = {
            comments = "italic",
            keywords = "bold",
            types = "italic,bold",
        },
        -- transparent = true,
    },
    palettes = {
        nightfox = {
            -- A specific style's value will be used over the `all`'s value
            bg0 = "#000000",
            bg1 = "#0f0f0f",
            bg2 = "#33322f",
            bg3 = "#595344",
        },
    }
})

-- Lua
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
    dark_variant = "main", -- main, moon, or dawn
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

local nordicPallete = require("nordic.colors")
require 'nordic'.setup {
    -- This callback can be used to override the colors used in the palette.
    on_palette = function(palette) return palette end,
    bold_keywords = true,
    italic_comments = true,
    transparent_bg = false,
    bright_border = true,
    reduced_blue = true,
    -- Swap the dark background with the normal one.
    swap_backgrounds = true,
    telescope = {
        -- Available styles: `classic`, `flat`.
        style = 'classic',
    },
    override = {
        Search = {
            bg = nordicPallete.blue0,
            underline = false,
            bold = false,
        },
        IncSearch = {
            bg = nordicPallete.blue2,
            underline = false,
            bold = true,
        },
        Visual = {
            bg = "#664200"
        }
        -- TelescopeResultsBorder = {
        --     fg = nordicPallete.orange.bright
        -- },
        -- TelescopePromptBorder = {
        --     fg = nordicPallete.orange.bright
        -- },
        -- TelescopePreviewBorder = {
        --     fg = nordicPallete.orange.bright
        -- },
    }
}

-- vim.cmd("colorscheme nordic")
vim.cmd('colorscheme catppuccin-mocha')
-- vim.cmd("colorscheme nordfox")
-- vim.cmd("colorscheme nightfox")
-- vim.cmd("colorscheme carbonfox")
-- vim.cmd("colorscheme onedark")
-- vim.cmd("colorscheme rose-pine")

-- a way of setting telescope theme
-- local colors = require("catppuccin.palettes").get_palette("mocha")
-- local TelescopeColor = {
--     TelescopeMatching = { fg = colors.flamingo },
--     TelescopeSelection = { fg = colors.text, bg = colors.surface0, bold = true },

--     TelescopePromptPrefix = { bg = colors.surface0 },
--     TelescopePromptNormal = { bg = colors.surface0 },
--     TelescopeResultsNormal = { bg = colors.mantle },
--     TelescopePreviewNormal = { bg = colors.mantle },
--     TelescopePromptBorder = { bg = colors.surface0, fg = colors.surface0 },
--     TelescopeResultsBorder = { bg = colors.mantle, fg = colors.mantle },
--     TelescopePreviewBorder = { bg = colors.mantle, fg = colors.mantle },
--     TelescopePromptTitle = { bg = colors.pink, fg = colors.mantle },
--     TelescopeResultsTitle = { fg = colors.mantle },
--     TelescopePreviewTitle = { bg = colors.green, fg = colors.mantle },
-- }
-- for hl, col in pairs(TelescopeColor) do
--     vim.api.nvim_set_hl(0, hl, col)
-- end

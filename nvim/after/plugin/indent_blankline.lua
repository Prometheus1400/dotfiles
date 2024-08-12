local hooks = require "ibl.hooks"

local highlight = {
    "RainbowRed",
    "RainbowYellow",
    "RainbowBlue",
    "RainbowOrange",
    "RainbowGreen",
    "RainbowViolet",
    "RainbowCyan",
}

-- bright colors
-- hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
--     vim.api.nvim_set_hl(0, "RainbowRed", { fg = "#E06C75" })
--     vim.api.nvim_set_hl(0, "RainbowYellow", { fg = "#E5C07B" })
--     vim.api.nvim_set_hl(0, "RainbowBlue", { fg = "#61AFEF" })
--     vim.api.nvim_set_hl(0, "RainbowOrange", { fg = "#D19A66" })
--     vim.api.nvim_set_hl(0, "RainbowGreen", { fg = "#98C379" })
--     vim.api.nvim_set_hl(0, "RainbowViolet", { fg = "#C678DD" })
--     vim.api.nvim_set_hl(0, "RainbowCyan", { fg = "#56B6C2" })
--     -- vim.api.nvim_set_hl(0, "IblScope", { fg = "#F00000" })
-- end)

-- dull colors
-- hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
    -- vim.api.nvim_set_hl(0, "RainbowRed", { fg = "#8B4B4F" })
    -- vim.api.nvim_set_hl(0, "RainbowYellow", { fg = "#948661" })
    -- vim.api.nvim_set_hl(0, "RainbowBlue", { fg = "#3A6B8C" })
    -- vim.api.nvim_set_hl(0, "RainbowOrange", { fg = "#87684A" })
    -- vim.api.nvim_set_hl(0, "RainbowGreen", { fg = "#617954" })
    -- vim.api.nvim_set_hl(0, "RainbowViolet", { fg = "#7C4990" })
    -- vim.api.nvim_set_hl(0, "RainbowCyan", { fg = "#355E68" })
    -- -- vim.api.nvim_set_hl(0, "IblScope", { fg = "#F00000" })
-- end)

local isEnabled = true
require("ibl").setup({
    scope = {
        enabled = false,
        show_start = false,
        show_end = false,
    },
    indent = {
        -- highlight = highlight,
        char = "│",
    },
    enabled = isEnabled
})

vim.keymap.set("n", "<leader>ll", function()
    isEnabled = not isEnabled
    require("ibl").update({
        enabled = isEnabled
    })
end)

-- this registers it to be active for specific file types
-- hooks.register(hooks.type.ACTIVE, function(bufnr)
--     return vim.tbl_contains(
--         { "yaml", "python" },
--         vim.api.nvim_get_option_value("filetype", { buf = bufnr })
--     )
-- end)

local currentTheme = vim.g.colors_name
require("lualine").setup({
    options = {
        -- theme = 'onedark'
        theme = currentTheme
    }
})

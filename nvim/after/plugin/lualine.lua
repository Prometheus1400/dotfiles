local python_venv = function()
    local venv = vim.env.VIRTUAL_ENV -- or vim.env.CONDA_DEFAULT_ENV
    if venv then
        return string.format("🐍 %s", vim.fn.fnamemodify(venv, ":h:t"))
    else
        return ""
    end
end

local currentTheme = vim.g.colors_name
require("lualine").setup({
    options = {
        theme = currentTheme
    },
    sections = {
        lualine_a = { 'mode' },
        lualine_b = { 'branch', 'diff', 'diagnostics' },
        lualine_c = { 'filename' },
        lualine_x = { 'encoding', 'fileformat', 'filetype', python_venv },
        lualine_y = { 'progress' },
        lualine_z = { 'location' }
    },
})

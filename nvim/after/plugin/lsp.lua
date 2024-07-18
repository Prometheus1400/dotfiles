require('neodev').setup()
local _border = "rounded"

require('mason').setup({
    ui = {
        border = _border
    }
})
require('mason-lspconfig').setup({
    -- Replace the language servers listed here
    -- with the ones you want to install
    ensure_installed = { 'rust_analyzer', 'gopls', 'lua_ls', 'jdtls', 'bashls', 'jsonls', 'pylsp' },
    handlers = {
        function(server_name)
            local attach_function = function(client, bufnr)
                local opts = { buffer = bufnr }
                vim.keymap.set({ 'n' }, 'K', vim.lsp.buf.hover, opts)
                vim.keymap.set({ 'n' }, 'gd', vim.lsp.buf.definition, opts)
                vim.keymap.set({ 'n' }, 'gD', vim.lsp.buf.declaration, opts)
                vim.keymap.set({ 'n' }, 'gi', vim.lsp.buf.implementation, opts)
                vim.keymap.set({ 'n' }, 'go', vim.lsp.buf.type_definition, opts)
                vim.keymap.set({ 'n' }, 'gr', vim.lsp.buf.references, opts)
                -- vim.keymap.set({ 'n' }, 'gs', vim.lsp.buf.signature_help, opts)

                vim.keymap.set({ 'n' }, '<leader>cf',
                    function() vim.lsp.buf.format({ async = false, timeout_ms = 10000 }) end, opts)
                vim.keymap.set({ 'n' }, "<leader>ca", vim.lsp.buf.code_action, opts)
                vim.keymap.set({ 'n' }, '<leader>crn', vim.lsp.buf.rename, opts)
                -- vim.keymap.set({ 'n' }, "<leader>crr", vim.lsp.buf.references, opts)
                vim.keymap.set({ 'n' }, "<leader>cdo", vim.diagnostic.open_float, opts)
                vim.keymap.set({ 'n' }, "<leader>cdn", vim.diagnostic.goto_next, opts)
                vim.keymap.set({ 'n' }, "<leader>cdp", vim.diagnostic.goto_prev, opts)
            end
            if server_name == "bashls" then
                require('lspconfig')[server_name].setup({
                    on_attach = attach_function,
                    filetypes = { 'sh', 'zsh' },
                })
            elseif server_name == "pylsp" then
                require('lspconfig')[server_name].setup({
                    on_attach = attach_function,
                    settings = {
                        pylsp = {
                            plugins = {
                                pyflakes = { enabled = true },
                                pycodestyle = { enabled = true, maxLineLength = 250 },
                                autopep8 = { enabled = false },
                                -- disable the default formatters
                                yapf = { enabled = false },
                                black = { enabled = false }
                            }
                        }
                    }
                })
            else
                require('lspconfig')[server_name].setup({
                    on_attach = attach_function
                })
            end
        end,
    }
})

-- popup borders
vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(
    vim.lsp.handlers.hover, { border = _border }
)
vim.lsp.handlers["textDocument/signatureHelp"] = vim.lsp.with(
    vim.lsp.handlers.signature_help, { border = _border }
)
require('lspconfig.ui.windows').default_options = {
  border = _border
}
vim.diagnostic.config {
    float = { border = _border }
}

-- diagnostic icons
-- lsp_zero.set_sign_icons({ error = '✘', warn = '▲', hint = '⚑', info = '»' })
vim.diagnostic.config({
    signs = {
        text = {
            [vim.diagnostic.severity.ERROR] = " ",
            [vim.diagnostic.severity.WARN] = " ",
            [vim.diagnostic.severity.HINT] = " ",
            [vim.diagnostic.severity.INFO] = " ",
        },
        linehl = {
            [vim.diagnostic.severity.ERROR] = 'ErrorMsg',
        },
        -- numhl = {
        --     [vim.diagnostic.severity.ERROR] = 'ErrorMsg',
        --     -- [vim.diagnostic.severity.WARN] = 'WarningMsg',
        -- },
    },
})

-- extra stuff for python to organize imports
local null_ls = require("null-ls")
null_ls.setup({
    sources = {
        null_ls.builtins.formatting.black,
        null_ls.builtins.formatting.isort,
    },
})

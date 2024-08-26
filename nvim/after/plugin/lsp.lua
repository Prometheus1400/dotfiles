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
    ensure_installed = { 'rust_analyzer', 'gopls', 'lua_ls', 'jdtls', 'bashls', 'jsonls', 'pylsp', 'yamlls' },
    handlers = {
        function(server_name)
            local attach_function = function(client, bufnr)
                local opts = { buffer = bufnr }
                vim.keymap.set({ 'n' }, 'K', vim.lsp.buf.hover, opts)
                -- go to's
                vim.keymap.set({ 'n' }, 'gd', vim.lsp.buf.definition, opts)
                vim.keymap.set({ 'n' }, 'gD', vim.lsp.buf.declaration, opts)
                vim.keymap.set({ 'n' }, 'gi', vim.lsp.buf.implementation, opts)
                vim.keymap.set({ 'n' }, 'go', vim.lsp.buf.type_definition, opts)
                -- vim.keymap.set({ 'n' }, 'gr', vim.lsp.buf.references, opts)
                -- vim.keymap.set({ 'n' }, 'gs', vim.lsp.buf.signature_help, opts)
                -- code actions
                vim.keymap.set({ 'n' }, '<leader>cf',
                    function() vim.lsp.buf.format({ async = false, timeout_ms = 10000 }) end, opts)
                vim.keymap.set({ 'n' }, "<leader>ca", vim.lsp.buf.code_action, opts)
                vim.keymap.set({ 'n' }, '<leader>crn', vim.lsp.buf.rename, opts)
                vim.keymap.set({ 'n' }, "<leader>crr", vim.lsp.buf.references, opts)
                vim.keymap.set({ 'n' }, "<leader>cs", "<CMD>Trouble lsp_document_symbols toggle<CR>", opts)
                -- diagnostics
                vim.keymap.set({ 'n' }, "<leader>cdo", vim.diagnostic.open_float, opts)
                vim.keymap.set({ 'n' }, "<leader>cdn", vim.diagnostic.goto_next, opts)
                vim.keymap.set({ 'n' }, "<leader>cdp", vim.diagnostic.goto_prev, opts)
                vim.keymap.set({ 'n' }, "<leader>cdb", "<CMD>Trouble diagnostics toggle focus=false filter.buf=0<CR>",
                    opts)                                                                                       -- buffer diagnostics
                vim.keymap.set({ 'n' }, "<leader>cdw", "<CMD>Trouble diagnostics toggle focus=false<CR>", opts) -- workspace diagnostics
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
            elseif server_name == "html" then
                local capabilities = vim.lsp.protocol.make_client_capabilities()
                capabilities.textDocument.completion.completionItem.snippetSupport = true
                capabilities.textDocument.publishDiagnostics = {
                    relatedInformation = true
                }
                require('lspconfig')[server_name].setup({
                    on_attach = attach_function,
                    capabilities = capabilities,
                    cmd = { "vscode-html-language-server", "--stdio" },
                    filetypes = { "html" },
                    init_options = {
                        configurationSection = { "html", "css", "javascript" },
                        embeddedLanguages = {
                            css = true,
                            javascript = true
                        },
                        provideFormatter = true
                    },
                    settings = {},
                    single_file_support = true
                })
            elseif server_name == "yamlls" then
                require('lspconfig').yamlls.setup {
                    on_attach = attach_function,
                    settings = {
                        yaml = {
                            validate = true,
                            -- disable the schema store
                            schemaStore = {
                                enable = false,
                                url = "",
                            },
                            -- manually select schemas
                            schemas = {
                                ['https://json.schemastore.org/kustomization.json'] = 'kustomization.{yml,yaml}',
                                ['/Users/kaleb/Desktop/stargate-stuff/pipelines/.vscode/stargate-schema.json'] = '/Users/kaleb/Desktop/stargate-stuff/pipelines/**/*.{yml,yaml}',
                            },
                            format = {
                                enable = false
                            }
                        }
                    }
                }
            elseif server_name == "clangd" then
                local capabilities = vim.lsp.protocol.make_client_capabilities()
                capabilities.textDocument.completion.completionItem.snippetSupport = true
                require('lspconfig').clangd.setup({
                    on_attach = attach_function,
                    capabilities = capabilities,
                    cmd = { "clangd", "--background-index", "--suggest-missing-includes",
                        "--all-scopes-completion", "--completion-style=detailed",
                    }
                })
            elseif server_name == "jdtls" then
                require('lspconfig').jdtls.setup({
                    on_attach = attach_function,
                    init_options = {
                        bundles = { "~/.m2/repository/org/projectlombok/lombok/1.18.34/lombok-1.18.34.jar" }
                    }
                })
                -- "--compile-commands-dir=" .. vim.g.cmake_build_dir }, -- custom build dir
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
        -- linehl = {
        --     [vim.diagnostic.severity.ERROR] = 'ErrorMsg',
        -- },
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
        null_ls.builtins.formatting.prettier.with({
            filetypes = {
                "javascript", "typescript", "css", "yaml", "yml", "markdown", "md", "txt",
            },
        }),
        null_ls.builtins.diagnostics.tidy.with({
            args = { "-errors" }
        }),
    },
})

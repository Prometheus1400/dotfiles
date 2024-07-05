require('neodev').setup()
local lsp_zero = require('lsp-zero')

lsp_zero.on_attach(function(client, bufnr)
    lsp_zero.default_keymaps({ buffer = bufnr })

    local opts = { buffer = bufnr }
    vim.keymap.set({ 'n' }, '<leader>cf', function()
        vim.lsp.buf.format({ async = false, timeout_ms = 10000 })
    end, opts)
    vim.keymap.set({ 'n' }, "<leader>ca", function()
        vim.lsp.buf.code_action()
    end, opts)
    vim.keymap.set({ 'n' }, '<leader>crn', function()
        vim.lsp.buf.rename()
    end, opts)
    vim.keymap.set({ 'n' }, "<leader>crr", function()
        vim.lsp.buf.references()
    end, opts)
    vim.keymap.set({ 'n' }, "<leader>cdo", function()
        vim.diagnostic.open_float()
    end, opts)
    vim.keymap.set({ 'n' }, "<leader>cdj", function()
        vim.diagnostic.goto_next()
    end, opts)
    vim.keymap.set({ 'n' }, "<leader>cdk", function()
        vim.diagnostic.goto_prev()
    end, opts)
end)

lsp_zero.set_sign_icons({
    error = '✘',
    warn = '▲',
    hint = '⚑',
    info = '»'
})

require('mason').setup({})
require('mason-lspconfig').setup({
    -- Replace the language servers listed here
    -- with the ones you want to install
    ensure_installed = { 'rust_analyzer', 'gopls', 'lua_ls', 'jdtls', 'bashls', 'jsonls', 'pylsp' },
    handlers = {
        function(server_name)
            local attach_function = function(client, bufnr)
                -- print(string.format('lsp %s attached!', server_name))
            end
            if server_name == "bashls" then
                require('lspconfig')[server_name].setup({
                    on_attach = attach_function,
                    filetypes = { 'sh', 'zsh' }
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
-- extra stuff for python to organize imports
local null_ls = require("null-ls")
null_ls.setup({
    sources = {
        null_ls.builtins.formatting.black,
        null_ls.builtins.formatting.isort,
    },
})

local cmp = require('cmp')
cmp.setup({
    mapping = cmp.mapping.preset.insert({
        -- Enter key confirms completion item
        ['<CR>'] = cmp.mapping.confirm({ select = false }),
        ['<Tab>'] = cmp.mapping.select_next_item(),
        -- Ctrl + space triggers completion menu
        ['<C-Space>'] = cmp.mapping.complete(),
    }),
    snippet = {
        expand = function(args)
            require('luasnip').lsp_expand(args.body)
        end,
    },
    sources = {
        { name = 'nvim_lsp' },
        { name = 'nvim_lua' },
        { name = 'nvim_lsp_signature_help' },
        { name = 'buffer', keyword_length = 3 },
    }
})

cmp.setup.filetype({"sql"}, {
    sources = {
        {name = "vim-dadbod-completion" },
        {name = "buffer", keywork_length = 3 }
    }
})

-- Use buffer source for `/` and `?` (if you enabled `native_menu`, this won't work anymore).
cmp.setup.cmdline({ '/', '?' }, {
    mapping = cmp.mapping.preset.cmdline(),
    sources = {
        { name = 'buffer' }
    }
})

-- Use cmdline & path source for ':' (if you enabled `native_menu`, this won't work anymore).
cmp.setup.cmdline(':', {
    mapping = cmp.mapping.preset.cmdline(),
    sources = cmp.config.sources({
        { name = 'path' }
    }, {
        { name = 'cmdline' }
    }),
    matching = { disallow_symbol_nonprefix_matching = false }
})

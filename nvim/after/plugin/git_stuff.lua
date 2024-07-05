-- vim.keymap.set("n", "<leader>gs", vim.cmd.Git)
-- vim.keymap.set("n", "<leader>gs", function()
--     vim.cmd.Git()
--     vim.cmd("wincmd L")
-- end)

-- vim.keymap.set("n", "gl", "<cmd>diffget //2<CR>")
-- vim.keymap.set("n", "gr", "<cmd>diffget //3<CR>")


require('gitsigns').setup({
    current_line_blame = true,
    on_attach = function(bufnr)
        local gitsigns = require("gitsigns")
        vim.keymap.set('n', '<leader>gh', gitsigns.preview_hunk, { buffer = bufnr })

        vim.keymap.set('n', '<leader>hn', function()
            if vim.wo.diff then
                vim.cmd.normal({ 'n', bang = true })
            else
                gitsigns.nav_hunk('next')
            end
        end)

        vim.keymap.set('n', '<leader>hp', function()
            if vim.wo.diff then
                vim.cmd.normal({ 'p', bang = true })
            else
                gitsigns.nav_hunk('prev')
            end
        end)
    end
})

require "gitlinker".setup({
    callbacks = {
        ["github.pie.apple.com"] = function(url_data)
            local url = require("gitlinker.hosts").get_base_https_url(url_data) ..
                "/blob/" .. url_data.rev .. "/" .. url_data.file
            if url_data.lstart then
                url = url .. "#L" .. url_data.lstart
                if url_data.lend then url = url .. "-L" .. url_data.lend end
            end
            return url
        end
    },
    mappings = "<leader>cgl"
})

local neogit = require('neogit')
neogit.setup({
    kind = "vsplit"
})
vim.keymap.set("n", "gs", neogit.open)

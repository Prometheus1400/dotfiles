vim.api.nvim_create_autocmd('InsertCharPre', {
    group = vim.api.nvim_create_augroup('closingPair', { clear = true }),
    -- pattern = '/tmp/mutt-*',
    callback = function()
        local line = vim.api.nvim_get_current_line()
        local leadingSpace = ''
        for _ in string.gmatch(line, ' ') do
            leadingSpace = leadingSpace .. ' '
        end

        local pressed_char = vim.v.char
        if pressed_char == '{' then
            vim.v.char = '{}'
            local key = vim.api.nvim_replace_termcodes('<Left>', true, false, true)
            vim.api.nvim_feedkeys(key, 'i', false)
        end
        -- if pressed_char == '(' then
        --     vim.v.char = '()'
        --     local key = vim.api.nvim_replace_termcodes('<Left>', true, false, true)
        --     vim.api.nvim_feedkeys(key, 'i', false)
        -- end

        -- if pressed_char == '[' then
        --     vim.v.char = '[]'
        --     local key = vim.api.nvim_replace_termcodes('<Left>', true, false, true)
        --     vim.api.nvim_feedkeys(key, 'i', false)
        -- end
        -- if pressed_char == '"' then
        --     vim.v.char = '""'
        --     local key = vim.api.nvim_replace_termcodes('<Left>', true, false, true)
        --     vim.api.nvim_feedkeys(key, 'i', false)
        -- end
        -- if pressed_char == "'" then
        --     vim.v.char = "''"
        --     local key = vim.api.nvim_replace_termcodes('<Left>', true, false, true)
        --     vim.api.nvim_feedkeys(key, 'i', false)
        -- end
    end,
})

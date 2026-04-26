import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
        exclude: ['__tests__/integration/**'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
})

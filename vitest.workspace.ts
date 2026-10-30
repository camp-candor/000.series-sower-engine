import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
    'apps/worker/vitest.config.ts',
    'packages/100.agent/vitest.config.ts',
    {
        test: {
            name: 'engine-core-pure',
            root: './packages/300.engine',
            environment: 'node',
            include: ['**/*.spec.ts', '**/*.test.ts'],
            setupFiles: ['./test/budget-matcher.setup.ts'],
            pool: 'threads',
            poolOptions: {
                threads: {
                    isolate: true,
                    singleThread: false,
                },
            },
        },
    },
])

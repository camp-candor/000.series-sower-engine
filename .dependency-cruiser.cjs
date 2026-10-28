/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'pure-engine-zero-io-boundary',
            comment:
                'packages/300.engine must remain a pure isolate with zero platform IO/rendering dependencies',
            severity: 'error',
            from: { path: '^packages/300\\.engine', pathNot: '\\.test\\.ts$' },
            to: {
                path: [
                    '^apps',
                    '^@cloudflare',
                    '(^|node:)child_process$',
                    '(^|node:)fs$',
                    '(^|node:)net$',
                    '(^|node:)http$',
                    'node:child_process',
                    'node:fs',
                    'node:net',
                    'node:http',
                    'react',
                    'remotion',
                    'puppeteer',
                    'playwright',
                    'canvas',
                    'better-sqlite3',
                ],
            },
        },
        {
            name: 'banned-media-libraries-in-simulation',
            comment:
                'Media rendering and compositing libraries are strictly barred from all core simulation packages',
            severity: 'error',
            from: { path: '^packages/' },
            to: {
                path: [
                    'remotion',
                    '@remotion/core',
                    '@remotion/cli',
                    '@remotion/renderer',
                    'fluent-ffmpeg',
                    'three',
                ],
            },
        },
        {
            name: 'no-cross-package-private-imports',
            comment:
                'Cross-package ingestion must route strictly through declared public client entry points',
            severity: 'error',
            from: { path: '^packages/([^/]+)' },
            to: {
                path: '(^|.*)packages/(?!$1)[^/]+/src/(?!client\\.ts$).+',
            },
        },
    ],
    options: {
        doNotFollow: {
            path: 'node_modules',
        },
        tsPreCompilationDeps: true,
        tsConfig: {
            fileName: './tsconfig.base.json',
        },
    },
}

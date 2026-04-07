const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

// Dynamically find where pnpm stores express
function findPnpmExpressPath() {
    const pnpmDir = path.resolve(__dirname, '../../node_modules/.pnpm');
    if (fs.existsSync(pnpmDir)) {
        const entries = fs.readdirSync(pnpmDir).filter(e => e.startsWith('express@'));
        if (entries.length > 0) {
            return path.join(pnpmDir, entries[0], 'node_modules');
        }
    }
    return null;
}

const resolveModules = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    'node_modules',
];

// Add pnpm express path if found
const pnpmExpressPath = findPnpmExpressPath();
if (pnpmExpressPath) {
    resolveModules.push(pnpmExpressPath);
}

// Also add the general pnpm virtual store
const pnpmNodeModules = path.resolve(__dirname, '../../node_modules/.pnpm/node_modules');
if (fs.existsSync(pnpmNodeModules)) {
    resolveModules.push(pnpmNodeModules);
}

module.exports = {
    mode: 'production',
    target: 'node',
    entry: path.resolve(__dirname, 'src/vercel.ts'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'vercel.js',
        libraryTarget: 'commonjs2',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        modules: resolveModules,
        alias: {
            '@sms-saas/shared-types': path.resolve(__dirname, '../../packages/shared-types'),
        },
        symlinks: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                        configFile: path.resolve(__dirname, 'tsconfig.json'),
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    externals: {
        '@prisma/client': 'commonjs2 @prisma/client',
        '@fastify/static': 'commonjs2 @fastify/static',
        '@fastify/view': 'commonjs2 @fastify/view',
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
        new webpack.IgnorePlugin({
            checkResource(resource) {
                const lazyImports = [
                    '@nestjs/microservices',
                    '@nestjs/microservices/microservices-module',
                    '@nestjs/websockets',
                    '@nestjs/websockets/socket-module',
                    'cache-manager',
                    'class-transformer/storage',
                    '@nestjs/platform-fastify',
                    'fastify-swagger',
                    '@apollo/subgraph',
                    '@apollo/gateway',
                    'ts-morph',
                    'class-transformer',
                    'class-validator',
                ];
                if (lazyImports.includes(resource)) {
                    try {
                        require.resolve(resource, { paths: [__dirname] });
                        return false;
                    } catch {
                        return true;
                    }
                }
                return false;
            },
        }),
    ],
    optimization: {
        minimize: false,
    },
};

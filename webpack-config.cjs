const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ProgressPlugin = require('progress-webpack-plugin')
const fs = require('fs');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = { facadeConfig }

function facadeConfig(config) {
    return function (env, argv) {
        const sharedConfig = getBaseConfig(env, argv)
        return [
            webConfig(env, argv, sharedConfig, config),
            serverConfig(env, argv, sharedConfig, config)
        ]
    }
}

function webConfig(env, argv, sharedConfig, { root, clientEntry, clientOutput, serverOutput }) {
    const configName = argv.configName[0]
    const isAnalyze = !!argv.analyze

    const clientFiles = path.join(root, serverOutput, 'web');

    if (!fs.existsSync(clientFiles)) {
        fs.mkdirSync(clientFiles, { recursive: true });
    }

    const scriptFiles = configName === 'client'
        ? fs.readdirSync(clientFiles)
            .reduce((acc, v) => ({
                ...acc,
                [v.split('.')[0]]: {
                    import: path.join(clientFiles, v),
                    filename: `scripts/[name].js`
                },
            }), {})
        : {}

    return {
        ...sharedConfig,
        name: 'client',
        target: 'web',
        entry: {
            'client' : {
                import: clientEntry,
                filename: '[name].js'
            },
            ...scriptFiles
        },
        output: {
            path: path.join(root, clientOutput),
            library: {
                name: ['FScripts', '[name]'],
                type: 'umd',
                export: 'default',
            },
        },
        plugins: [
            ...sharedConfig.plugins,
            ...(isAnalyze ? [new BundleAnalyzerPlugin({
                analyzerMode: 'static',
            })] : [])
        ],
        externals: [
            // removing server dependencies
            './Dom',
            '@kogoshvili/facade/server/Dom',
            './Facade',
            '@kogoshvili/facade/server/Facade',
            'json-diff-ts',
            'html-entities',
        ],
        optimization: {
            minimizer: [new TerserPlugin()],
        },
        resolve: {
            ...sharedConfig.resolve,
            alias: {
                '@kogoshvili/facade/component': '@kogoshvili/facade/client',
                'ComponentGraph': '@kogoshvili/facade/client'
            }
        }
    };
}

function serverConfig(env, argv, sharedConfig, { root, serverEntry, serverOutput }) {
    return {
        ...sharedConfig,
        name: 'server',
        target: 'node18',
        entry: serverEntry,
        output: {
            path: path.resolve(root, serverOutput),
            filename: 'server.js',
            library: {
                type: 'commonjs',
            },
            globalObject: 'this',
        },
        node: {
            // __dirname: false,
            // __filename: false,
        },
        externalsPresets: { node: true },
        externals: [
            // 'utf-8-validate',
            // 'bufferutil',
            // 'express'
        ],
        optimization: {
            nodeEnv: 'development'
        },
        resolve: {
            ...sharedConfig.resolve,
            alias: {
                '@kogoshvili/facade/component': '@kogoshvili/facade/server',
                'ComponentGraph': '@kogoshvili/facade/server'
            }
        }
    }
}

function getBaseConfig(env, argv) {
    const mode = argv.mode || 'development'
    const isProd = mode === 'production'

    return {
        mode,
        devtool: isProd ? false : 'source-map',
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.facade'],
            extensionAlias: {
                '.js': ['.js', '.ts', '.facade'],
                '.cjs': ['.cjs', '.cts'],
                '.mjs': ['.mjs', '.mts']
            },
            plugins: [new TsconfigPathsPlugin()],
        },
        plugins: [new ProgressPlugin(true), new MiniCssExtractPlugin()],
        module: {
            rules: [
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        'sass-loader',
                    ],
                },
                {
                    test: /\.([cm]?ts|tsx)$/,
                    use: [
                        {
                            loader: require.resolve('ts-loader'),
                            options: {
                                transpileOnly: true,
                            }
                        },
                        {
                            loader: require.resolve('@kogoshvili/facade/loader'),
                        },
                    ]
                },
                {
                    test: /\.(facade)$/,
                    use: [
                        {
                            loader: require.resolve('ts-loader'),
                            options: {
                                transpileOnly: true,
                                appendTsxSuffixTo: [/\.facade$/]
                            },
                        },
                        {
                            loader: require.resolve('@kogoshvili/facade/loader'),
                        },
                    ],
                },
            ]
        },
    }
}

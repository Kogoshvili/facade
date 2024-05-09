const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ProgressPlugin = require('progress-webpack-plugin')
const fs = require('fs');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {
    const configName = argv.configName[0]
    const mode = argv.mode || 'development'
    const isProd = mode === 'production'
    const isAnalyze = !!argv.analyze

    const sharedConfig = {
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
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                    }
                },
                {
                    test: /\.(facade)$/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: true,
                                appendTsxSuffixTo: [/\.facade$/]
                            },
                        },
                        {
                            loader: path.resolve('./loader.cjs'),
                        },
                    ],
                },
            ]
        },
    }

    const fileNames = configName === 'client' ? fs.readdirSync('./dist/web')
        .reduce((acc, v) => ({ ...acc, [v.split('.')[0]]: `./dist/web/${v}` }), {}) : {}

    return [
        {
            ...sharedConfig,
            name: 'client',
            target: 'web',
            entry: {
                'client' : './src/app/client/index.ts',
                ...fileNames
            },
            output: {
                path: path.join(__dirname, 'public'),
                library: {
                    name: ['FScripts', '[name]'],
                    type: 'umd',
                },
                filename: '[name].js',
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
                'facade/server/Dom',
                './Facade',
                'facade/server/Facade',
                'json-diff-ts',
                'html-entities'
            ],
            optimization: {
                minimizer: [new TerserPlugin()],
            }
        },
        {
            ...sharedConfig,
            name: 'server',
            target: 'node18',
            entry: './src/server.ts',
            output: {
                path: path.resolve(__dirname, 'dist'),
                filename: 'server.js',
                library: {
                    type: 'commonjs',
                },
                globalObject: 'this',
            },
            node: {
                __dirname: false,
                __filename: false,
            },
            externalsPresets: { node: true },
            externals: [
                'utf-8-validate',
                'bufferutil',
                'express'
            ],
            optimization: {
                nodeEnv: 'development'
            }
        }
    ]
}

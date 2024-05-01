const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
var ProgressPlugin = require('progress-webpack-plugin')

module.exports = (env, argv) => {
    const mode = argv.mode || 'development'
    const isProd = mode === 'production'
    const isAnalyze = !!argv.analyze

    const sharedConfig = {
        mode: mode,
        devtool: isProd ? false : 'source-map',
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
            extensionAlias: {
                '.js': ['.js', '.ts'],
                '.cjs': ['.cjs', '.cts'],
                '.mjs': ['.mjs', '.mts']
            },
            plugins: [new TsconfigPathsPlugin()],
        },
        plugins: [new ProgressPlugin(true)],
        optimization: {
            minimizer: [new TerserPlugin()],
        }
    }

    return [
        {
            ...sharedConfig,
            target: 'web',
            entry: {
                facade: './src/facade/client/index.ts',
                client: './src/app/client/index.ts'
            },
            output: {
                path: path.resolve(__dirname, 'public'),
                filename: '[name].js',
            },
            plugins: [
                ...(isAnalyze ? [new BundleAnalyzerPlugin.BundleAnalyzerPlugin()] : [])
            ],
            module: {
                rules: [
                    {
                        test: /\.([cm]?ts|tsx)$/,
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        }
                    },
                    {
                        test: /\.([cm]?ts|tsx)$/,
                        use: [
                            {
                                loader: path.resolve('./loader.cjs'),
                            },
                        ],
                    },
                ]
            },
        },
        {
            ...sharedConfig,
            entry: './src/server.ts',
            target: 'node18',
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
            ],
            module: {
                rules: [
                    {
                        test: /\.([cm]?ts|tsx)$/,
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        }
                    },
                    {
                        test: /\.([cm]?ts|tsx)$/,
                        use: [
                            {
                                loader: path.resolve('./loader.cjs'),
                            },
                        ],
                    },
                ]
            },
        }
    ]
}

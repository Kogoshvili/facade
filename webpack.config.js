const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const options = require('preact').options;

module.exports = (env, argv) => {
    const mode = argv.mode || 'development'
    const isProd = mode === 'production'
    const isAnalyze = !!argv.analyze

    const sharedConfig = {
        mode: mode,
        devtool: isProd ? false : 'inline-source-map',
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
            extensionAlias: {
                '.js': ['.js', '.ts'],
                '.cjs': ['.cjs', '.cts'],
                '.mjs': ['.mjs', '.mts']
            },
            plugins: [new TsconfigPathsPlugin()],
        },
        plugins: [],
        optimization: {
            minimize: false,
            minimizer: [new TerserPlugin()],
        }
    }

    const clientContext = path.resolve(__dirname, 'src/facade/client')

    return [
        {
            ...sharedConfig,
            target: 'web',
            context: clientContext,
            entry: './index.ts',
            output: {
                path: path.resolve(__dirname, 'public'),
                filename: 'client.js',
            },
            plugins: [
                // new CopyPlugin({
                //     patterns: [
                //         { from: './index.html', to: './index.html' },
                //     ],
                // }),
                ...(isAnalyze ? [new BundleAnalyzerPlugin.BundleAnalyzerPlugin()] : [])
            ],
            module: {
                rules: [
                    {
                        test: /\.([cm]?ts|tsx)$/,
                        loader: 'ts-loader',
                        options: {
                            context: clientContext,
                        }
                    },
                ]
            },
        },
        {
            ...sharedConfig,
            entry: './src/app/server.ts',
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
                ]
            },
        }
    ]
}

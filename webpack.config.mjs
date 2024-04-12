import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import BundleAnalyzerPlugin from 'webpack-bundle-analyzer'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import nodeExternals from 'webpack-node-externals'

const __dirname = path.resolve(path.dirname(''))

export default function (env, argv) {
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
        module: {
            rules: [
                {
                    test: /\.([cm]?ts|tsx)$/,
                    loader: 'ts-loader'
                },
            ]
        },
        plugins: [],
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin()],
        }
    }

    return [
        {
            ...sharedConfig,
            target: 'web',
            entry: './src/facade/client/index.ts',
            output: {
                path: path.resolve(__dirname, 'public'),
                filename: 'client.js',
            },
            plugins: [
                new CopyPlugin({
                    patterns: [
                        { from: './src/facade/client/index.html', to: './index.html' },
                    ],
                }),
                ...(isAnalyze ? [new BundleAnalyzerPlugin.BundleAnalyzerPlugin()] : [])
            ]
        },
        // {
        //     ...sharedConfig,
        //     target: 'node',
        //     entry: './src/server.ts',
        //     output: {
        //         path: path.resolve(__dirname, 'dist'),
        //         filename: 'server.js',
        //     },
        //     externals: [nodeExternals()],
        // }
    ]
}

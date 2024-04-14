import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import BundleAnalyzerPlugin from 'webpack-bundle-analyzer'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
// import nodeExternals from 'webpack-node-externals'

const __dirname = path.resolve(path.dirname(''))

export default function (_env, argv) {
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
            minimize: true,
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
        // {
        //     ...sharedConfig,
        //     entry: './src/app/server.ts',
        //     output: {
        //         path: path.resolve(__dirname, 'dist'),
        //         filename: 'server.mjs',
        //         libraryTarget: 'module',
        //     },
        //     externalsPresets: { node: true },
        //     externals: [nodeExternals()],
        //     module: {
        //         rules: [
        //             {
        //                 test: /\.([cm]?ts|tsx)$/,
        //                 loader: 'ts-loader',
        //                 options: {
        //                     compilerOptions: {
        //                         module: 'es6'
        //                     }
        //                 }
        //             },
        //         ]
        //     },
        //     experiments: {
        //         outputModule: true
        //     }
        // }
    ]
}

import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import BundleAnalyzerPlugin from 'webpack-bundle-analyzer';

const __dirname = path.resolve(path.dirname(''));

export default function (env, argv) {
    const mode = argv.mode || 'development';
    const isProd = mode === 'production';
    const isAnalyze = !!argv.analyze;

    const plugins = [
        new CopyPlugin({
            patterns: [
              { from: "./index.html", to: "./index.html" },
            ],
        }),
    ];

    if (isAnalyze) {
        plugins.push(
            new BundleAnalyzerPlugin.BundleAnalyzerPlugin()
        )
    }

    return {
        mode: mode,
        devtool: isProd ? false : "inline-source-map",
        context: path.resolve(__dirname, 'src/facade/client'),
        entry: './index.ts',
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'public'),
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
            extensionAlias: {
                ".js": [".js", ".ts"],
                ".cjs": [".cjs", ".cts"],
                ".mjs": [".mjs", ".mts"]
            }
        },
        module: {
            rules: [
                {
                    test: /\.([cm]?ts|tsx)$/,
                    loader: "ts-loader"
                },
            ]
        },
        plugins,
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin()],
        },
    }
}

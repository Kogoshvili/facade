import path from 'path';

const __dirname = path.resolve(path.dirname(''));

export default {
    mode: 'development',
    devtool: "inline-source-map",
    context: path.resolve(__dirname, 'src/client'),
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
    }
};

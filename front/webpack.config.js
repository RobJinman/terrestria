const path = require("path");
const webpack = require("webpack");
const merge = require("webpack-merge");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isProduction = process.env.NODE_ENV === "production";

const rootDir = path.resolve(__dirname, "src");
const distDir = path.resolve(__dirname, "dist");

const baseConfig = {
  context: rootDir,
  entry: {
    app: "./app/main.ts"
  },
  mode: isProduction ? "production" : "development",
  target: "web",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ ".ts", ".js" ]
  },
  output: {
    filename: "[name].bundle.js",
    path: distDir
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: {
            comments: false
          }
        }
      })
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: path.resolve(rootDir, "index.html"),
        to: distDir
      },
      {
        from: path.resolve(rootDir, "assets", "**", "*"),
        to: distDir
      }
    ]),
    new webpack.DefinePlugin({
      "typeof CANVAS_RENDERER": JSON.stringify(true),
      "typeof WEBGL_RENDERER": JSON.stringify(true)
    }),
  ]
};

let config = {};

if (isProduction) {
  config = baseConfig;
}
else {
  config = merge(baseConfig, {
    devtool: "source-map",
    devServer: {
      contentBase: rootDir
    }
  });
}

module.exports = config;

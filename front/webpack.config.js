const path = require("path");
const webpack = require("webpack");
const merge = require("webpack-merge");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const isProduction = process.env.NODE_ENV === "production";

const rootDir = path.resolve(__dirname, "src");
const distDir = path.resolve(__dirname, "dist");

let websocketUrl = isProduction ? "wss://api.terrestria.io:3001"
                                : "ws://192.168.0.125:3001";

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
        exclude: [
          /\.spec.ts$/,
          /node_modules/
        ]
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader"
        ]
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
    new HtmlWebpackPlugin({
      title: "Terrestria",
      template: path.resolve(rootDir, "index.html"),
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true
      }
    }),
    new CopyWebpackPlugin([
      {
        from: path.resolve(rootDir, "assets", "**", "*"),
        to: distDir
      }
    ]),
    new webpack.DefinePlugin({
      "typeof CANVAS_RENDERER": JSON.stringify(true),
      "typeof WEBGL_RENDERER": JSON.stringify(true),
      __WEBSOCKET_URL__: JSON.stringify(websocketUrl)
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

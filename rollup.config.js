// import resolve from '@rollup/plugin-node-resolve';
// import babel from '@rollup/plugin-babel';
const resolve  = require('@rollup/plugin-node-resolve')
const babel  = require('@rollup/plugin-babel')
module.exports =  {
  input: "src/index.js",
  output: [
    // {
    //   file: "dist/index-umd.js",
    //   format: "umd",
    //   name: "index",
    // },
    // {
    //   file: "dist/index.js",
    //   format: "es",
    // },
    {
      file: "dist/index.js",
      format: "cjs",
    },
  ],
  plugins: [
    resolve(),
    babel({ babelHelpers: 'bundled' })
  ]
};

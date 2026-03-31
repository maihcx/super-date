import { defineConfig } from 'rollup';
import type { RollupOptions } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import brotliPlugin from 'rollup-plugin-brotli';
import typescript from '@rollup/plugin-typescript';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
);

const banner = `/*! SuperDate v${pkg.version} | MIT License */`;
const treeshake: RollupOptions['treeshake'] = { preset: 'recommended' };


const PUBLIC_IDENTIFIERS = [
  'SuperDate', 'init',
  'bind', 'init', 'find', 'destroy', 'rebind', 'effector', 'registerPlugin', 'unregisterPlugin', 'version'
];

const FIND_PROPERTIES = [
  'all'
];

const DATA_PROPERTIES = [
  'dateFormat',
  'token',
  'idx'
];

const PUBLIC_PROPERTIES = [
  'SuperDate', 'init',
  'bind', 'find', 'destroy', 'rebind', 'effector', 'registerPlugin', 'unregisterPlugin', 'version',
  ...FIND_PROPERTIES,
  ...DATA_PROPERTIES,
];

const brotliOptions = {
  filter: /\.(js|css|mjs|json|html|svg)$/i,
  additionalFiles: [] as string[],
  minSize: 0,
  fileName: (filename: string) => `${filename}.br`,
  options: { quality: 11 },
};

// PostCSS profiles
const postcssNonMin = postcss({
  extract: 'super-date.css',
  minimize: false,
  sourceMap: true,
  plugins: [autoprefixer()],
});

const postcssMin = postcss({
  extract: 'super-date.min.css',
  minimize: true,
  sourceMap: false,
  plugins: [autoprefixer(), cssnano({ preset: 'default' })],
});

const terserUMD = terser({
  ecma: 2020,
  safari10: true,
  format: { comments: /^!/ },
  compress: {
    passes: 3,
    drop_console: false,
    drop_debugger: false,
    pure_getters: true,
    reduce_funcs: true,
    reduce_vars: true,
    hoist_funs: true,
    hoist_vars: true,
    hoist_props: true,
    inline: 3,
    toplevel: true,
    dead_code: true,
    unused: true,
    switches: true,
    conditionals: true,
    comparisons: true,
    booleans: true,
    keep_fargs: false,
    keep_infinity: true,
    collapse_vars: true,
    unsafe: true,
    unsafe_math: true,
    unsafe_arrows: true,
    typeofs: true,
  },
  mangle: {
    toplevel: true,
    reserved: PUBLIC_IDENTIFIERS,
    properties: {
      reserved: PUBLIC_PROPERTIES,
      regex: /.*/,
      keep_quoted: true,
      builtins: false
    },
  },
});

const terserESM = terser({
  module: true,
  ecma: 2020,
  format: { comments: /^!/ },
  compress: {
    passes: 3,
    drop_console: false,
    drop_debugger: false,
    pure_getters: true,
    reduce_funcs: true,
    reduce_vars: true,
    hoist_funs: true,
    hoist_vars: true,
    hoist_props: true,
    inline: 3,
    toplevel: true,
    dead_code: true,
    unused: true,
    switches: true,
    conditionals: true,
    comparisons: true,
    booleans: true,
    keep_fargs: false,
    keep_infinity: true,
    collapse_vars: true,
    unsafe: true,
    unsafe_math: true,
    unsafe_arrows: true,
    typeofs: true,
  },
  mangle: {
    toplevel: true,
    reserved: PUBLIC_IDENTIFIERS,
    properties: {
      reserved: PUBLIC_PROPERTIES,
      regex: /.*/,
      keep_quoted: true,
      builtins: false
    },
  },
});

export default defineConfig([
  // UMD (non-min)
  {
    input: 'src/ts/global.ts',
    output: {
      file: 'dist/super-date.umd.js',
      format: 'umd',
      name: 'SuperDate',
      sourcemap: true,
      banner,
    },
    plugins: [
      replace({
        preventAssignment: true,
        __LIB_VERSION__: JSON.stringify(pkg.version),
        __LIB_NAME__: JSON.stringify('SuperDate'),
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      resolve(),
      commonjs(),
      postcssNonMin,
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
      }),
    ],
    treeshake,
  },

  // ESM (non-min)
  {
    input: 'src/ts/index.ts',
    output: {
      file: 'dist/super-date.esm.js',
      format: 'esm',
      sourcemap: true,
      banner,
    },
    plugins: [
      replace({
        preventAssignment: true,
        __LIB_VERSION__: JSON.stringify(pkg.version),
        __LIB_NAME__: JSON.stringify('SuperDate'),
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      resolve(),
      commonjs(),
      postcssNonMin,
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
      }),
    ],
    treeshake,
  },

  // UMD minified
  {
    input: 'src/ts/global.ts',
    output: {
      file: 'dist/super-date.min.js',
      format: 'umd',
      name: 'SuperDate',
      sourcemap: false,
      banner,
    },
    plugins: [
      replace({
        preventAssignment: true,
        __LIB_VERSION__: JSON.stringify(pkg.version),
        __LIB_NAME__: JSON.stringify('SuperDate'),
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: false,
      }),
      resolve(),
      commonjs(),
      postcssMin,
      terserUMD,
      brotliPlugin(brotliOptions),
    ],
    treeshake,
  },

  // ESM minified
  {
    input: 'src/ts/index.ts',
    output: {
      file: 'dist/super-date.esm.min.js',
      format: 'esm',
      sourcemap: false,
      banner,
    },
    plugins: [
      replace({
        preventAssignment: true,
        __LIB_VERSION__: JSON.stringify(pkg.version),
        __LIB_NAME__: JSON.stringify('SuperDate'),
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: false,
      }),
      resolve(),
      commonjs(),
      postcssMin,
      terserESM,
      brotliPlugin(brotliOptions),
    ],
    treeshake,
  },
]);
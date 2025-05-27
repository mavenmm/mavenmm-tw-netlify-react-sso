import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

export default [
  // Main package build
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.esm.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
      }),
    ],
    external: ["react", "react-dom", "axios", "js-cookie"],
  },
  // Server-side utilities build
  {
    input: "src/server.ts",
    output: [
      {
        file: "dist/server.esm.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
      }),
    ],
    external: ["jsonwebtoken", "cookie"],
  },
  // Netlify handlers build
  {
    input: "src/netlify/createHandlers.ts",
    output: [
      {
        file: "dist/netlify/createHandlers.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
        declarationMap: true,
      }),
    ],
    external: ["@netlify/functions"],
  },
  // CLI build
  {
    input: "src/cli/scaffold.ts",
    output: [
      {
        file: "dist/cli/scaffold.js",
        format: "esm",
        sourcemap: true,
        banner: "#!/usr/bin/env node",
      },
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
      }),
    ],
    external: ["fs", "path"],
  },
];

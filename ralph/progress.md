# Ralph Build Progress

## Codebase Notes

- Monorepo: Turborepo + Bun
- apps/web on port 3000 (do not touch)
- packages/ui = shared shadcn components (do not touch)
- packages/typescript-config = shared tsconfig (do not touch)
- All packages: type: "module", workspace:* refs
- Biome enforced via Ultracite: use `interface` for objects, `type` for unions
- next.config.ts pattern: transpilePackages, reactCompiler, typedRoutes

## Completed Stories

- SPEC-1: @opentools/spec scaffolded
  - Use `.js` extensions in relative imports (NodeNext moduleResolution)
  - Biome sorts interface members alphabetically — don't fight it
  - Package exports map subpaths directly to `./src/*.ts`
  - tsconfig extends `@workspace/typescript-config/base.json` with `outDir: ./dist`, `include: ["src"]`

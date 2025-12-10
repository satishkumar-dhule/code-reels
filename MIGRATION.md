# Migration to pnpm

This project has been migrated from npm to pnpm for faster package management and better dependency resolution.

## What Changed

- **Package Manager**: npm → pnpm
- **Registry**: Corporate proxy → Public npm registry
- **Lockfile**: package-lock.json → pnpm-lock.yaml
- **CI/CD**: Updated GitHub Actions to use pnpm

## Benefits

- **3x faster installs** compared to npm
- **Disk space savings** through hard links
- **Strict dependency resolution** prevents phantom dependencies
- **Better monorepo support** (if needed in future)

## Usage

Replace all `npm` commands with `pnpm`:

```bash
# Before
npm install
npm run dev
npm run build
npm run deploy:pages

# After
pnpm install
pnpm run dev
pnpm run build
pnpm run deploy:pages
```

## Configuration

- **`.npmrc`**: Forces use of public npm registry
- **`pnpm-lock.yaml`**: New lockfile (committed to repo)
- **GitHub Actions**: Updated to use pnpm with caching

## Troubleshooting

If you encounter issues:

1. **Clear node_modules**: `rm -rf node_modules && pnpm install`
2. **Update pnpm**: `npm install -g pnpm@latest`
3. **Check registry**: `pnpm config get registry` should show `https://registry.npmjs.org/`

The migration is complete and all existing workflows should work seamlessly with pnpm.
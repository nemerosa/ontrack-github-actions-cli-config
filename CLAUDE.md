# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run lint       # ESLint
npm run build      # Bundle with Vercel NCC (outputs to dist/)
npm test           # Jest (--passWithNoTests; no unit tests currently exist)
npm run all        # lint + build + test
```

The build step runs `ncc build index.js -o dist --source-map --license licenses.txt`, producing `dist/index.js` — the file GitHub Actions actually executes.

## Architecture

This is a GitHub Action that installs and configures the [Yontrack CLI](https://github.com/nemerosa/ontrack-cli) and then runs `yontrack ci config` to register the current CI build in a Yontrack instance.

**Execution flow (`index.js` → 128 lines):**
1. Reads `url`/`token` inputs (falling back to `YONTRACK_URL`/`YONTRACK_TOKEN` env vars)
2. Delegates CLI installation to `@nemerosa/ontrack-github-actions-module-install` — this handles downloading the binary, adding it to PATH, and configuring authentication
3. Reads the config file path (default: `.yontrack/ci.yaml`) and constructs arguments for `yontrack ci config`
4. Collects environment variables to pass to the CLI: predefined GitHub env vars + custom `env-vars` input + any env var starting with `YONTRACK_CI_`
5. Parses the JSON output from the CLI to extract build/branch/project IDs and names
6. Exports those as both GitHub Actions outputs and environment variables (`YONTRACK_BUILD_ID`, etc.)

**Key files:**
- `index.js` — entire action logic (source of truth)
- `dist/index.js` — bundled output committed to the repo; must be rebuilt and committed after changes to `index.js`
- `action.yml` — action metadata: inputs, outputs, `runs: using: node20 main: dist/index.js`
- `.yontrack/ci.yaml` — example Yontrack config file used by the action's own CI

## Release process

Releases are automated via `semantic-release` (`.releaserc`). Commit messages follow Angular convention: `fix` → patch, `feat` → minor, `refactor` → major. The CI pipeline (`main` branch only) commits the updated `dist/` files and then creates a GitHub release with the new version tag.

## NPM registry

The `@nemerosa` scoped packages come from GitHub Packages. The `.npmrc` file sets this up; you need a valid `NODE_AUTH_TOKEN` to install dependencies.

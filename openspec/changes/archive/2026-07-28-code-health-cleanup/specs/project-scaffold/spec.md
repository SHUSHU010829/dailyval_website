## MODIFIED Requirements

### Requirement: Required runtime dependencies installed

The scaffold SHALL declare `next-intl` and `@phosphor-icons/react` in `package.json` so that subsequent changes can import them without dependency churn. The scaffold SHALL NOT declare `framer-motion`, `gsap`, `@next/mdx`, or `@mdx-js/react` unless a concrete consumer of that dependency exists in the codebase.

#### Scenario: Build succeeds with all dependencies resolved

- **WHEN** `npm run build` is executed after the change is applied
- **THEN** the build SHALL complete successfully and SHALL NOT report missing modules for any of the listed dependencies

#### Scenario: Removed dependencies have no remaining imports

- **WHEN** the codebase is scanned for imports of `framer-motion`, `gsap`, `@next/mdx`, or `@mdx-js/react`
- **THEN** zero matches SHALL be found

## REMOVED Requirements

### Requirement: MDX support is wired into Next.js config

**Reason**: This was scaffolded in anticipation of authoring legal pages (`tos`, `privacy`, `support`) as MDX content. The legal pages were ultimately implemented as plain TSX, and zero `.mdx` files exist anywhere in the repository. Keeping the `@next/mdx` wrapper and `pageExtensions` MDX entries in `next.config.ts` provides no value and adds unnecessary dependency surface.

**Migration**: No consumers exist. Remove `createMDX` from `next.config.ts` and drop `md`/`mdx` from `pageExtensions`. If MDX content authoring is needed in the future, re-introduce this requirement as part of that change.

#### Scenario: No MDX wrapper remains in Next.js config

- **WHEN** `next.config.ts` is inspected after this change
- **THEN** it SHALL NOT import or apply `createMDX`, and `pageExtensions` SHALL NOT include `md` or `mdx`

## ADDED Requirements

### Requirement: Type-checking, CI, and test infrastructure exist

The project SHALL provide a `typecheck` script in `package.json` (`tsc --noEmit`) independent of the Next.js build's type-checking step. The repository SHALL provide a CI workflow that installs dependencies, runs type-checking, and runs the production build on every push/PR. The project SHALL have a working unit test runner (Vitest) with at least one passing test, proving the test infrastructure is wired correctly.

#### Scenario: CI workflow runs on push

- **WHEN** a commit is pushed to the repository
- **THEN** the CI workflow SHALL install dependencies, run `npm run typecheck`, and run `npm run build`, failing the workflow if any step fails

#### Scenario: Test runner executes successfully

- **WHEN** `npm run test` is executed
- **THEN** Vitest SHALL run and report at least one passing test with zero failures

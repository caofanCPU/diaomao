# @windrun-huaiin/diaomao

## 31.0.0

### Major Changes

- feat(upgrade): `@windrun-huaiin/diaomao` upgrade for better UI components

## 30.0.0

### Major Changes

- feat(upgrade): `@windrun-huaiin/diaomao` upgrade for better UI components

## 29.1.0

### Minor Changes

- feat(upgrade): `@windrun-huaiin/diaomao` upgrade for better UI components

## 29.0.0

### Major Changes

- feat(upgrade): `@windrun-huaiin/diaomao` architecture 2.0 major upgrade
  - Upgrade Prisma from 6.x to 7.8.0
  - Implicitly remove fumadocs / clerk / stripe dependencies, decouple architecture via underlying `@windrun-huaiin/*` packages
  - Support MDX build pre-rendering and local real-time hot re-render
  - Optimize Page Route & API Route bundle size: Page Route reduced from 34M+ to 5M, API Route from 35M+ to 6M
  - Standardize UI icon usage specification
  - Decouple UI components to avoid heavy entry coupling and reduce overall bundle volume

## 26.0.0

### Major Changes

- feat(upgrade): `@windrun-huaiin` upgrade
  - uniform version `26.0.0`

## 25.0.0

### Major Changes

- feat(upgrade): `@windrun-huaiin` upgrade
  - use local-md

## 20.0.0

### Major Changes

- feat(upgrade): `@windrun-huaiin` upgrade
  - stripe update
  - site icon update

## 16.0.1

### Patch Changes

- feat(hero): `@windrun-huaiin` upgrade hero components

## 16.0.0

### Major Changes

- feat(i18n): `@windrun-huaiin` upgrade i18n handler for supporting custom biz translation json file

## 15.0.0

### Major Changes

- fix(upgrade): `@windrun-huaiin` dependencies now fix a serious build packages issue util version `15.1.0`

## 14.3.4

### Patch Changes

- fix(upgrade): Update package dependencies and improve authentication middleware

  - Bump versions of `@windrun-huaiin/backend-core` to 14.6.0 and `@windrun-huaiin/third-ui` to 14.5.0
  - Refactor authentication middleware in `src/proxy.ts` to utilize `buildProtectedPageRoutePatterns` for route matching
  - Simplify `CreditPopover` component by using `getOptionalServerAuthUser` for user authentication

## 14.3.3

### Patch Changes

- fix(update): gitignore issue

## 14.3.2

### Patch Changes

- feat(mdx): fuma TOC component customizability

## 14.3.1

### Patch Changes

- feat(mdx): fuma TOC component customizability

## 14.3.0

### Minor Changes

- feat(mdx): fuma TOC component customizability
  - support theme color with mdx TOC
  - use fluent svg path for good view
  - remove fumadocs patch 'cause no need them at all after this version

## 14.2.0

### Minor Changes

- feat(upgrade): user source and user init by upgrade dependences

## 14.1.1

### Patch Changes

- feat(upgrade): user source

## 14.1.0

### Minor Changes

- feat(cli): use cli for upgrade dependencies
  - `@windrun-huaiin/dev-scripts`, from `14.1.2`

## 14.0.0

### Major Changes

- feat(clerk): upgrade clerk dependency

## 13.2.1

### Patch Changes

- fix(legal): fixed website name(IMPORTANT)
  - fixed mermaid graph by upgrade dependency

## 13.2.0

### Minor Changes

- fix(legal): fixed website name(IMPORTANT)
  - fixed mermaid graph by upgrade dependency

## 13.1.0

### Minor Changes

- feat(theme): upgrade dependencies packages
  - support 5 colors by env config
  - purple, orange, indigo, emerald, rose by `NEXT_PUBLIC_STYLE_ICON_COLOR`
  - remove `NEXT_PUBLIC_STYLE_SVG_ICON_COLOR` cause unuseful
  - complete legal docs

## 13.0.0

### Major Changes

- feat(update): upgrade dependencies packages

## 12.1.0

### Minor Changes

- fix(locale): `localPrefixAsNeeded` rename to `localePrefixAsNeeded` by `NEXT_PUBLIC_I18N_LOCALE_PREFIX_AS_NEEDED`

## 12.0.1

### Patch Changes

- fix(locale): support as-needed localPrefix by `NEXT_PUBLIC_I18N_LOCALE_PREFIX_AS_NEEDED`
  - clerk auth issue fixed
  - localePrefix custom config
  - mdx docs, DO NOT use name `why-docs`, `nextjs-architecture` cause ROUTE PROBLEMS

## 12.0.0

### Major Changes

- feature(locale): support as-needed localPrefix by `NEXT_PUBLIC_I18N_LOCALE_PREFIX_AS_NEEDED`
  - clerk auth issue fixed
  - localePrefix custom config
  - mdx docs, DO NOT use name `why-docs`, `nextjs-architecture` cause ROUTE PROBLEMS

## 11.2.0

### Minor Changes

- feature(upgrade): **`@windrun-huaiin/third-ui`** package upgrade fot better style

## 11.1.2

### Patch Changes

- feature(upgrade): eslint upgrade, stripe API version upgrade and add sign-up bonus feature with tooltip

## 11.1.1

### Patch Changes

- security(dependcy): CNVD-2025-29923 about NextJS Remote2Shell issue fixed

## 11.1.0

### Minor Changes

- fix(backend-core): integrate `@windrun-huaiin/backend-core` for LTS code update
  - optimize cli commander for sync init-sql

## 11.0.0

### Major Changes

- feat(backend-core): integrate `@windrun-huaiin/backend-core` for LTS code update

## 10.0.1

### Patch Changes

- feat(dependency): update `@windrun-huaiin/third-ui` version for custom header view order

## 10.0.0

### Major Changes

- chore(upgrade): update project configuration and dependencies

  - Added new entries to .gitignore for Claude and Codex files.
  - Updated TypeScript configuration to use 'react-jsx' for JSX transformation.
  - Modified package.json to update patched dependencies for fumadocs-ui and fumadocs-core.
  - Added new SQL schema for user and API log tables.
  - Removed outdated database migration files and documentation.
  - Refactored middleware to proxy for BigInt serialization.
  - Introduced new aggregate services for billing and user management.
  - Updated various components and services to improve functionality and maintainability.

## 2.8.0

### Minor Changes

- fix(money): v2.0

## 2.7.0

### Minor Changes

- fix(money): v2.0

## 2.6.1

### Patch Changes

- fix(font): repair font export issue in vercel deployment, sometimes could cause build error

## 2.6.0

### Minor Changes

- fix(mdx): mermaid now support preview with zoom-out dialog model!

## 2.5.1

### Patch Changes

- fix(env): url config

## 2.5.0

### Minor Changes

- feat(mdx): update fuma patch

## 2.4.0

### Minor Changes

- feat(app): env config comment

## 2.3.6

### Patch Changes

- fix(app): SEO config hotfix

## 2.3.5

### Patch Changes

- feat(update): SEO use base component

## 2.3.4

### Patch Changes

- feat(style): price-plan now use new UI

## 2.3.3

### Patch Changes

- feat(style): i18n translation now support rich text by origin html tag

## 2.3.2

### Patch Changes

- fix(main): gallery hotfix

## 2.3.1

### Patch Changes

- feat(main): gallery use R2

## 2.3.0

### Minor Changes

- fix(style): hero text style

## 2.2.0

### Minor Changes

- feat(banner): depend-off fumadocs-banner

## 2.1.2

### Patch Changes

- fix(mdx): remove unuse mdx blog

## 2.1.1

### Patch Changes

- fix(clerk): update dependency for signup button

## 2.1.0

### Minor Changes

- fix(section): style fix

## 2.0.3

### Patch Changes

- fix(icon): website logo

## 2.0.2

### Patch Changes

- fix(createApp): light

## 2.0.1

### Patch Changes

- fix(createApp): one command for standtard project init

## 2.0.0

### Major Changes

- fix(createApp): one command for standtard project init

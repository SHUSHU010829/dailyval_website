## 1. Icon tree-shaking

- [x] 1.1 In `src/components/Icon.tsx`, replace `import * as PhosphorIcons from "@phosphor-icons/react"` with named imports of the 23 icons actually used site-wide (`ArrowSquareOut`, `Backpack`, `ChartBar`, `ChatCircle`, `ChatCircleDots`, `CheckCircle`, `Crown`, `FileText`, `GameController`, `Handshake`, `Heart`, `InstagramLogo`, `Lightning`, `MagnifyingGlass`, `Medal`, `PaperPlaneTilt`, `Plant`, `Star`, `Storefront`, `ThreadsLogo`, `TrendUp`, `UsersThree`, `VideoCamera`) and a `Record<PhosphorIconName, ComponentType>` lookup map, satisfying "Icon.tsx 改用明確列舉的靜態 import 對照表"

## 2. Remove unused dependencies and MDX config

- [x] 2.1 Run `pnpm remove gsap framer-motion @mdx-js/react @next/mdx`. Design decision: "移除 MDX 相關依賴與設定，而非保留給未來使用"
- [x] 2.2 In `next.config.ts`, remove the `createMDX` import/wrapper and drop `"md"`/`"mdx"` from `pageExtensions`, satisfying required runtime dependencies installed and MDX support is wired into Next.js config (removed)

## 3. Lockfile and docs

- [x] 3.1 Remove `pnpm-lock.yaml` from `.gitignore` and `git add pnpm-lock.yaml`. Design decision: "`pnpm-lock.yaml` 加入版控，其餘 lockfile 繼續忽略"
- [x] 3.2 Rewrite `README.md` to accurately describe the project (Orbitron/Rajdhani/Noto Sans TC fonts, actual dev commands, project structure), removing the unused Geist font mention
- [x] 3.3 Create `.env.example` documenting `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_CREATOR_FORM_ENDPOINT`

## 4. Dead code removal

- [x] 4.1 Delete `src/components/sections/TestimonialsSection.tsx`
- [x] 4.2 Remove the dead `testimonials` namespace from `messages/en.json` and `messages/zh-TW.json`
- [x] 4.3 In `src/components/WebVitalsReporter.tsx`, guard all `console.log` calls behind `process.env.NODE_ENV !== "production"`

## 5. Constants consolidation

- [x] 5.1 Create `src/lib/site-config.ts` exporting `APP_STORE_URL`, `COMMUNITY_URL`, and `SUPPORT_EMAIL`
- [x] 5.2 Replace the 7 hardcoded App Store URL occurrences (`src/app/[locale]/page.tsx`, `src/components/SiteFooter.tsx`, `src/components/MobileDownloadBar.tsx`, `src/components/AppStoreQRCode.tsx`, `src/components/sections/FinalCtaSection.tsx`, `src/components/SiteNav.tsx`, `src/components/sections/HeroSection.tsx`) with `APP_STORE_URL` from `site-config.ts`
- [x] 5.3 Replace the 3 hardcoded community URL occurrences (`src/components/SiteFooter.tsx`, `src/components/SiteNav.tsx`, `src/components/sections/CommunitySection.tsx`) with `COMMUNITY_URL` from `site-config.ts`, satisfying "常數集中到 `src/lib/site-config.ts`，並移除從未真正在地化的 `community.joinUrl`"
- [x] 5.4 Remove the `community.joinUrl` key from `messages/en.json` and `messages/zh-TW.json` since `CommunitySection.tsx` now reads the URL directly from `site-config.ts`
- [x] 5.5 In `src/app/[locale]/support/page.tsx`, replace the hardcoded `mailto:support@dailyval.com` in `renderRich`'s `email` tag with `SUPPORT_EMAIL` from `site-config.ts`

## 6. AdSense consent gate

- [x] 6.1 Create `src/components/AdConsentGate.tsx`. Design decision: "AdSense 同意機制：自建輕量橫幅 + 條件式載入 script，而非串接 Google Funding Choices" (client component): reads a stored consent decision from `localStorage`; shows an accept/decline banner when no decision is stored; on accept, mounts a `next/script` tag for `adsbygoogle.js` and persists the decision; on decline, persists the decision and renders nothing further, satisfying "AdSense script does not load without explicit user consent"
- [x] 6.2 Remove the unconditional AdSense `<Script>` from `src/app/layout.tsx` and render `<AdConsentGate />` from `src/app/[locale]/layout.tsx` instead (inside `NextIntlClientProvider`, since the gate needs i18n context)
- [x] 6.3 Add translation keys for the consent banner text (accept/decline/message) in `messages/en.json` and `messages/zh-TW.json`
- [x] 6.4 Create `public/ads.txt` with `google.com, pub-1773132783019070, DIRECT, f08c47fec0942fa0`, satisfying "Web ads.txt authorizes the AdSense publisher"

## 7. Typecheck, CI, and test infrastructure

- [x] 7.1 Add `"typecheck": "tsc --noEmit"` to `package.json` scripts
- [x] 7.2 Create `.github/workflows/ci.yml` running install → `npm run typecheck` → `npm run build` on push/PR, satisfying "CI workflow runs on push"
- [x] 7.3 Run `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`, create `vitest.config.mts` (React plugin + tsconfig paths + jsdom environment), and add `"test": "vitest run"` to `package.json` scripts. Design decision: "測試框架選用 Vitest + React Testing Library（依 Next.js 官方文件）"
- [x] 7.4 Create `src/lib/safe-raw.test.ts` with at least one test covering the fallback-on-missing-key behavior of `safeRaw()`, satisfying "Type-checking, CI, and test infrastructure exist" and "Test runner executes successfully"

## 8. Verification

- [x] 8.1 Run `npm run build` and confirm it passes with no new type or lint errors
- [x] 8.2 Run `npm run typecheck` and confirm it passes
- [x] 8.3 Run `npm run test` and confirm the `safeRaw()` test passes
- [x] 8.4 Manually load the site in a browser, confirm the AdSense consent banner appears, and confirm no `adsbygoogle.js` request fires until "accept" is clicked

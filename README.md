# Leo Ladipo — portfolio

A personal portfolio with résumé-backed work, an original interactive LL sculpture, and a static fallback when graphics or JavaScript cannot load.

## Develop

Use Node 22.12+ (`nvm use` selects the Node 22 line), then:

```sh
npm ci
npm run dev
```

The local address is printed by Vite. No API keys, email provider, or environment file is required. Contact links open the visitor’s email app; the copy button reports clipboard permission failures rather than claiming success.

## Verify

```sh
npm run build
npm test
```

Browser tests launch **Brave**, not a downloaded Chromium browser. Install Brave at its standard location, or set `BRAVE_PATH` to its executable. The Playwright browser type is named `chromium`, but its `executablePath` points explicitly to Brave.

Tests cover desktop/mobile widths, keyboard navigation, project details, actual résumé downloads, clipboard success/failure, reduced motion, unavailable WebGL, context loss/restoration, failed entry-script loading, and React recovery. They use the production build. Physical iPhone/Safari and Android behavior still needs device verification.

The Three.js chunk is loaded separately from the main application. Its size produces a Vite chunk warning; the content does not wait for it. One capped-resolution scene replaces the earlier independent canvases and downloaded models. The scene suspends animation offscreen or in a hidden tab, and respects reduced motion and the visible pause control.

## Update content

- `src/constants/index.js`: contact details, career history, navigation, and skills.
- `src/components/Works.jsx`: project descriptions and contribution details.
- `src/components/About.jsx` and `Hero.jsx`: personal introduction.
- `public/Leo-Ladipo-Resume.pdf`: résumé download, copied from the supplied résumé.
- `index.html`: search/social metadata and the static loading/recovery profile. Keep its contact links aligned with the profile data.

The InBalance image comes from the existing InBalance landing-page assets and depicts sample product data. Work descriptions are grounded in the supplied résumé; they do not assert current product availability or customer counts. The older template project examples, testimonials, third-party models, and unused assets have been removed from this version.

## Publish

A manual GitHub Pages workflow replaces the old `gh-pages` npm command. The workflow builds a fresh artifact with the lockfile before deploying, rather than publishing whatever happens to be in a local `dist` directory.

After reviewing and pushing the changes, select **GitHub Actions** as the repository’s Pages publishing source. Run **Deploy portfolio to GitHub Pages** from the Actions tab on the intended branch. The workflow is manual; pushing code alone does not trigger publication. Provider settings and a live deployment have not been verified as part of local development.

## Assets

The LL monogram, procedural sculpture, and system illustration are defined in code. Manrope is self-hosted under the SIL Open Font License; its notice is in `public/fonts/OFL-Manrope.txt`. React and Three.js retain their dependency licenses. No external font or analytics request is needed to view the site.

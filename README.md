# anshaj.dev

Source for [anshaj.dev](https://anshaj.dev) — my personal site.

Built with [Astro](https://astro.build), styled with a warm-parchment editorial
design system (see `src/styles/tokens.css`), and deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `master`.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # type-check + static build into dist/
npm run preview  # serve the built site
```

## Editing content

Content lives in YAML under `src/data/` and is validated at build time by the
Zod schemas in `src/content.config.ts`. A typo in a data file fails the build
rather than silently rendering an empty section.

| File | Drives |
| --- | --- |
| `src/data/site.ts` | Name, role, tagline, intro copy, nav and social links |
| `src/data/highlights.yml` | The four impact numbers below the hero |
| `src/data/projects.yml` | The "Selected work" cards (`featured: true` = large card) |
| `src/data/experience.yml` | The experience timeline |
| `src/data/awards.yml` | The "Recognition" section (award artwork lives in `src/assets/awards/`) |
| `src/data/teaching.yml` | Teaching and speaking |
| `src/data/skills.yml` | The toolbox groups |
| `src/data/certifications.yml` | Home page sample and `/certifications` |

To add a project, append an entry to `src/data/projects.yml` with a unique
`id` and the next `order` value. No component changes needed.

The "Writing" section is not stored in this repo — `src/lib/feed.ts` reads the
latest posts from the Compute Blog RSS feed at build time, so publishing a post
and re-running the deploy is enough to update the site. If the feed is
unreachable the build logs a warning and omits the section rather than failing.

Star counts on the open-source cards are fetched the same way, by
`src/lib/github.ts`, and refresh on the daily rebuild. Counts below three are
hidden on purpose — a "1 star" badge reads weaker than no badge at all — and a
rate-limited or failed request simply drops the badge instead of breaking the
build. CI passes `GITHUB_TOKEN` because shared runner IPs burn through the
anonymous 60-requests-per-hour limit.

Structured data is generated from the same collections: the JSON-LD `Person`
block in `src/layouts/Base.astro` builds `award` and `hasCredential` from
`awards.yml` and `certifications.yml`, so adding a credential updates the SEO
markup with no extra step.

## Design system

Tokens are defined once in `src/styles/tokens.css`. The rules that matter:

- Canvas is Bone Parchment `#f8f8f6` — never pure white for large areas.
- Headlines are Source Serif 4 at weight 400; Inter carries everything else at
  400–580. Nothing goes above 580.
- Clay `#d97757` is the only chromatic color and is decorative only — accent
  dots and rules, never button fills or link colors.
- Cards: 24px radius elevated, 16px nested, 8px for buttons and controls.
- Shadows are a soft `0 4px 20px rgba(0,0,0,.04)` on hover, or absent.

## Quality checks

```bash
npm test  # builds are served by `astro preview`, then Playwright drives them
```

`tests/` holds the guardrails that protect things which are easy to break by
accident and hard to spot by eye:

- **Contrast** — walks every element that renders its own text, resolves the
  real background painted behind it and asserts WCAG AA. This catches the case
  a palette review cannot: a color that passes on parchment but fails on soft
  stone or on the black footer. `aria-hidden` decoration is exempt.
- **Overflow** — no element crosses the viewport edge at 390, 768, 1280 or
  1512px.
- **Writing row order** — a regression guard for a real bug where a base grid
  placement overrode its own `min-width` reset and stacked the arrow into the
  title column on desktop.
- **Landmarks, alt text and link names**, plus the Open Graph and canonical
  metadata that link previews depend on.

CI runs on every pull request and again as a gate before deploy. Scheduled
rebuilds skip the gate on purpose: they exist only to pull a new blog post out
of the feed, so a flaky check must never be able to stall fresh content.

The weekly link check is intentionally *not* a deploy gate — external sites rot
and rate-limit on their own schedule. It opens an issue instead.

## Deployment

GitHub Pages is configured with **Source: GitHub Actions**. `public/CNAME`
holds the custom domain, so it is copied into `dist/` on every build — do not
delete it.

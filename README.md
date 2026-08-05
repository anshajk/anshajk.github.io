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

## Design system

Tokens are defined once in `src/styles/tokens.css`. The rules that matter:

- Canvas is Bone Parchment `#f8f8f6` — never pure white for large areas.
- Headlines are Source Serif 4 at weight 400; Inter carries everything else at
  400–580. Nothing goes above 580.
- Clay `#d97757` is the only chromatic color and is decorative only — accent
  dots and rules, never button fills or link colors.
- Cards: 24px radius elevated, 16px nested, 8px for buttons and controls.
- Shadows are a soft `0 4px 20px rgba(0,0,0,.04)` on hover, or absent.

## Deployment

GitHub Pages is configured with **Source: GitHub Actions**. `public/CNAME`
holds the custom domain, so it is copied into `dist/` on every build — do not
delete it.

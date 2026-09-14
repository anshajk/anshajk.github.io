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

## Local resume PDF

Keep the private LaTeX source at `resume.tex` in the repository root. The source
and generated artifacts are ignored by Git and are not part of the website.
Do not put them in `public/`, which is deployed to GitHub Pages.

Install [Tectonic](https://tectonic-typesetting.github.io/) and
[Poppler](https://poppler.freedesktop.org/) once (macOS):

```bash
brew install tectonic poppler
npm run resume:build
open .resume-build/resume.pdf
```

The build uses the project's existing Node.js runtime with no extra npm
dependencies. Tectonic compiles locally, downloading and caching required TeX
packages on first use; the resume is not uploaded to a rendering service.
Shell execution from LaTeX is disabled.

The command allows **one or two pages** and checks that text can be extracted
without replacement characters or typographic ligatures that can interfere with
keyword matching.
It writes `.resume-build/resume.pdf`, a plain-text companion `resume.txt` for
reading-order review, and compiler diagnostics in `resume.log`. Compilation,
page-count, or text-extraction failures leave the last successful PDF untouched.
Missing tools or a missing private source produce explicit errors. It does not
build the resume in CI or publish it with the site.

Use a single column, conventional section headings, ordinary text for contact
details, and readable body type. Review the PDF and extracted text after edits:
these checks help ATS readability but cannot guarantee compatibility with every
recruiting system. Trim lower-priority content rather than shrinking text to
force a page fit.

```bash
npm run resume:test  # build-command tests; no private resume or TeX tools needed
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
| `src/data/writing.yml` | The ordered "Start here" collection on `/writing/` |

To add a project, append an entry to `src/data/projects.yml` with a unique
`id` and the next `order` value. No component changes needed.

### Writing and the Start here collection

`/writing/` combines a curated learning path with up to 20 recent posts from
the Compute Blog RSS feed. The homepage previews four recent posts and links
to this page. Articles remain on the blog; the feed is not treated as a
complete historical archive.

Edit `src/data/writing.yml` to change the Start here collection. Each entry has
an `id`, positive `order`, `title`, `href`, `topic`, and `summary`. Keep IDs stable
and order values unique; the page sorts by `order`. The collection schema
validates the field types and URLs.

Publishing a blog post and rebuilding refreshes the RSS-derived lists.
If the feed is unavailable, the build logs a warning, but Start here,
the homepage Writing section, and direct blog links remain available with
an explanatory fallback message.

### Live GitHub statistics

Projects with a GitHub repository link automatically show stars and forks,
including featured projects. Stars below three and zero forks stay hidden,
independently of each other.

`src/lib/github.ts` fetches a build-time snapshot. The browser then refreshes
counts directly from GitHub's public API when the page loads and when the tab
becomes visible again. A five-minute local cache, shared in-flight requests,
and a retry cooldown limit unnecessary requests. This is a near-live refresh,
not an instant push update or continuous polling.

If GitHub is rate-limited, offline, or returns invalid data, the page retains
its displayed counts and logs the failed refresh. Without JavaScript, the
build-time snapshot still works. If no successful snapshot exists, unavailable
counts stay hidden rather than showing invented zeroes.

CI's `GITHUB_TOKEN` is used only by the build-time module. Browser requests are
unauthenticated, omit credentials, and never receive that token. Private
repository responses are not published. `src/lib/repository-stats.ts` contains
the shared validation and display rules; `src/scripts/repository-stats.ts`
handles live updates.

Structured data is generated from the same collections: the JSON-LD `Person`
block in `src/layouts/Base.astro` builds `award` and `hasCredential` from
`awards.yml` and `certifications.yml`, so adding a credential updates the SEO
markup with no extra step.

### Adding deeper project pages

Case studies can be added without changing frameworks or installing a CMS:

1. Create `src/pages/work/streaks.astro` (or another project slug). This creates
   `/work/streaks/`.
2. Import `Base` from `../../layouts/Base.astro` and wrap the page in
   `<Base pageTitle="Streaks: design and trade-offs" description="...">`.
   Use the existing `section`, `container`, and typography styles.
3. Explain the problem, architecture, trade-offs, how to run the project,
   results, and what you would improve. Add diagrams, examples, and screenshots.
4. Add a link to that project in `src/data/projects.yml`, alongside its demo
   and GitHub links:

   ```yaml
   - label: Read the case study
     href: https://anshaj.dev/work/streaks/
   ```

   The link schema requires an absolute URL, including for internal pages.
5. Add the new route to `tests/pages.ts`, then run `npm run build` and `npm test`.

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
- **Writing discovery** — curated links, ordering, page metadata, and fallback
  behavior when the RSS feed is unavailable.
- **Repository statistics** — live updates, visibility thresholds, cache expiry,
  and failure handling. Browser tests mock GitHub's API to stay deterministic.
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

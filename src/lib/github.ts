const API = 'https://api.github.com/repos';

/**
 * Repos with only a star or two read as weaker than saying nothing at all, so
 * a count is only worth surfacing once it represents real interest.
 */
const MIN_STARS = 3;

/** Pulls `owner/repo` out of any GitHub URL, ignoring everything else. */
export function repoFromUrl(url: string): string | null {
  const match = url.match(
    /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/
  );
  return match ? `${match[1]}/${match[2]}` : null;
}

/**
 * Reads star counts at build time. The daily scheduled rebuild keeps them
 * current without any client-side request.
 *
 * Fails soft on purpose: unauthenticated GitHub allows 60 requests an hour per
 * IP and CI runners share addresses, so a rate limit or an outage must degrade
 * to "no star counts" rather than break the build.
 */
export async function getStarCounts(
  repos: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const token = process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'anshaj.dev-build',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  await Promise.all(
    [...new Set(repos)].map(async (repo) => {
      try {
        const response = await fetch(`${API}/${repo}`, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return;

        const data = (await response.json()) as { stargazers_count?: number };
        const stars = data.stargazers_count ?? 0;
        if (stars >= MIN_STARS) counts.set(repo, stars);
      } catch {
        // Leave the repo out; the card simply renders without a count.
      }
    })
  );

  return counts;
}

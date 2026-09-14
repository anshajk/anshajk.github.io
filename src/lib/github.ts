import {
  parseRepositoryStats,
  repositoryApiUrl,
  type RepositoryStats,
} from './repository-stats';

/** Pulls `owner/repo` out of any GitHub URL, ignoring everything else. */
export function repoFromUrl(url: string): string | null {
  const match = url.match(
    /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/
  );
  return match ? `${match[1]}/${match[2]}` : null;
}

/**
 * Build-time counts remain available without JavaScript or if a live refresh
 * fails. Authentication stays in this server-only module, never the browser.
 */
export async function getRepositoryStats(
  repos: string[]
): Promise<Map<string, RepositoryStats>> {
  const counts = new Map<string, RepositoryStats>();
  const token = process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'anshaj.dev-build',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  await Promise.all(
    [...new Set(repos)].map(async (repo) => {
      try {
        const response = await fetch(repositoryApiUrl(repo), {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          throw new Error(`GitHub API responded ${response.status}`);
        }

        const data: unknown = await response.json();
        counts.set(repo, parseRepositoryStats(data));
      } catch (error) {
        console.warn(
          `[github] could not load counts for ${repo}:`,
          error instanceof Error ? error.message : error
        );
      }
    })
  );

  return counts;
}

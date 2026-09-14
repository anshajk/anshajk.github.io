export interface RepositoryStats {
  stars: number;
  forks: number;
}

export const MIN_STARS = 3;
export const STATS_CACHE_MS = 5 * 60 * 1000;
export const STATS_CACHE_PREFIX = 'anshaj.dev:github-stats:';

const formatter = new Intl.NumberFormat('en-US');

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function isRepositoryStats(value: unknown): value is RepositoryStats {
  return (
    typeof value === 'object' &&
    value !== null &&
    'stars' in value &&
    'forks' in value &&
    isCount(value.stars) &&
    isCount(value.forks)
  );
}

export function parseRepositoryStats(value: unknown): RepositoryStats {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('stargazers_count' in value) ||
    !('forks_count' in value)
  ) {
    throw new Error('GitHub response is missing repository counts');
  }
  if ('private' in value && value.private === true) {
    throw new Error('Private repository statistics are not published');
  }

  const stats = { stars: value.stargazers_count, forks: value.forks_count };
  if (!isRepositoryStats(stats)) {
    throw new Error('GitHub repository counts must be non-negative integers');
  }
  return stats;
}

export function repositoryApiUrl(repo: string): string {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error(`Invalid GitHub repository name: ${repo}`);
  }
  return `https://api.github.com/repos/${repo}`;
}

export function formatRepositoryCount(count: number, kind: 'star' | 'fork') {
  return `${formatter.format(count)} ${kind}${count === 1 ? '' : 's'}`;
}

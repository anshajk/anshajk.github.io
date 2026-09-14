import {
  formatRepositoryCount,
  isRepositoryStats,
  MIN_STARS,
  parseRepositoryStats,
  repositoryApiUrl,
  STATS_CACHE_MS,
  STATS_CACHE_PREFIX,
  type RepositoryStats,
} from '../lib/repository-stats';

interface StatsResult {
  stats: RepositoryStats;
  source: 'cache' | 'live';
}

const pending = new Map<string, Promise<StatsResult | null>>();
const lastAttempt = new Map<string, number>();

function cachedStats(repo: string): RepositoryStats | null {
  try {
    const raw = localStorage.getItem(`${STATS_CACHE_PREFIX}${repo}`);
    if (!raw) return null;
    const cached: unknown = JSON.parse(raw);
    if (
      typeof cached !== 'object' ||
      cached === null ||
      !('fetchedAt' in cached) ||
      !('stats' in cached) ||
      typeof cached.fetchedAt !== 'number' ||
      !Number.isFinite(cached.fetchedAt) ||
      !isRepositoryStats(cached.stats)
    ) {
      throw new Error('Invalid cached repository counts');
    }

    const age = Date.now() - cached.fetchedAt;
    return age >= 0 && age < STATS_CACHE_MS ? cached.stats : null;
  } catch (error) {
    console.warn(`[github] cannot use cached counts for ${repo}:`, error);
    return null;
  }
}

async function fetchStats(repo: string): Promise<StatsResult | null> {
  try {
    const response = await fetch(repositoryApiUrl(repo), {
      headers: { accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-cache',
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`);
    }
    const data: unknown = await response.json();
    const stats = parseRepositoryStats(data);

    try {
      localStorage.setItem(
        `${STATS_CACHE_PREFIX}${repo}`,
        JSON.stringify({ stats, fetchedAt: Date.now() })
      );
    } catch (error) {
      console.warn(`[github] cannot cache counts for ${repo}:`, error);
    }

    return { stats, source: 'live' };
  } catch (error) {
    console.warn(
      `[github] could not refresh ${repo}; keeping displayed counts:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function latestStats(repo: string): Promise<StatsResult | null> {
  const cached = cachedStats(repo);
  if (cached) return { stats: cached, source: 'cache' };

  const request = pending.get(repo);
  if (request) return request;
  const attempted = lastAttempt.get(repo);
  if (attempted !== undefined && Date.now() - attempted < STATS_CACHE_MS) {
    return null;
  }

  lastAttempt.set(repo, Date.now());
  const next = fetchStats(repo).finally(() => pending.delete(repo));
  pending.set(repo, next);
  return next;
}

function updateWidget(widget: HTMLElement, result: StatsResult) {
  const stars = widget.querySelector<HTMLAnchorElement>('[data-repo-stars]');
  const forks = widget.querySelector<HTMLAnchorElement>('[data-repo-forks]');
  if (!stars || !forks) {
    console.warn('[github] repository count widget is missing its links');
    return;
  }

  stars.textContent = formatRepositoryCount(result.stats.stars, 'star');
  forks.textContent = formatRepositoryCount(result.stats.forks, 'fork');
  stars.hidden = result.stats.stars < MIN_STARS;
  forks.hidden = result.stats.forks === 0;
  widget.hidden = stars.hidden && forks.hidden;
  widget.dataset.stars = String(result.stats.stars);
  widget.dataset.forks = String(result.stats.forks);
  widget.dataset.githubSource = result.source;
}

export function initRepositoryStats() {
  const widgets = document.querySelectorAll<HTMLElement>('[data-github-repo]');
  const refresh = () => {
    for (const widget of widgets) {
      const repo = widget.dataset.githubRepo;
      if (!repo) {
        console.warn('[github] repository count widget has no repository');
        continue;
      }
      void latestStats(repo).then((result) => {
        if (result) updateWidget(widget, result);
      });
    }
  };

  refresh();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
}

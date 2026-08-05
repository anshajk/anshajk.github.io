import { XMLParser } from 'fast-xml-parser';

export interface Post {
  title: string;
  url: string;
  summary: string;
  date: Date;
}

const FEED_URL = 'https://compute.anshaj.dev/feed';

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Reads the latest Compute Blog posts at build time. A feed outage must not
 * break the deploy, so failures resolve to an empty list and the section is
 * simply omitted.
 */
export async function getLatestPosts(limit = 4): Promise<Post[]> {
  try {
    const response = await fetch(FEED_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'user-agent': 'anshaj.dev build' },
    });

    if (!response.ok) {
      throw new Error(`feed responded ${response.status}`);
    }

    const parser = new XMLParser({ ignoreAttributes: false });
    const feed = parser.parse(await response.text());
    const raw = feed?.rss?.channel?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return items
      .map((item: Record<string, unknown>) => ({
        title: stripHtml(String(item.title ?? '')),
        url: String(item.link ?? ''),
        summary: stripHtml(String(item.description ?? '')),
        date: new Date(String(item.pubDate ?? '')),
      }))
      .filter(
        (post: Post) =>
          post.title && post.url && !Number.isNaN(post.date.getTime())
      )
      .sort((a: Post, b: Post) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  } catch (error) {
    console.warn(
      `[writing] could not load ${FEED_URL}, omitting the section:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

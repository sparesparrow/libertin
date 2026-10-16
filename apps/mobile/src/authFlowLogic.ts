import type { NetworkMode } from './runtimeConfig';

export type PostLoginStep = 'success' | 'verify' | 'blocked';

export function nextStepAfterLogin(verified: boolean, networkMode: NetworkMode): PostLoginStep {
  if (verified) return 'success';
  return networkMode === 'mock' ? 'verify' : 'blocked';
}

interface RawFeedItem {
  readonly id: string;
  readonly author?: { readonly displayName?: string | null } | null;
  readonly content?: string | null;
}

interface RawFeedResponse {
  readonly items: readonly RawFeedItem[];
}

export interface FeedItem {
  readonly id: string;
  readonly author: string;
  readonly content: string | null;
}

export async function completeFeedLoad(
  load: () => Promise<RawFeedResponse>,
): Promise<{ readonly step: 'feed'; readonly items: FeedItem[] }> {
  const response = await load();
  return {
    step: 'feed',
    items: response.items.map((item) => ({
      id: item.id,
      author: item.author?.displayName ?? 'Anonym',
      content: item.content ?? null,
    })),
  };
}

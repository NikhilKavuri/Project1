import { normalizeHandle } from './normalizeHandle';
import { isQuestion } from '../comments/questionFilter';
import type { Comment } from '../comments/zeroHallucinationCluster';
import { providerConnectionError, ScanError } from '../preview/scanError';

type ChannelResource = {
  id: string;
  snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string }; medium?: { url: string } } };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
};
type CommentResource = {
  id: string;
  snippet: {
    authorChannelId?: { value: string };
    authorDisplayName: string;
    textOriginal?: string;
    textDisplay: string;
    publishedAt: string;
    likeCount: number;
  };
};
type Thread = {
  snippet: { topLevelComment: CommentResource; totalReplyCount: number };
  replies?: { comments: CommentResource[] };
};
type List<T> = { items?: T[]; nextPageToken?: string };

export type Upload = { id: string; title: string; description: string; publishedAt: string };
export type Creator = { id: string; title: string; handle: string; avatarUrl: string | null; uploadsPlaylistId: string | null; subscriberCount: number | null };

class YouTubeError extends ScanError {
  constructor(readonly reason: string, status = 502) {
    const quota = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
    const restrictedKey = ['keyInvalid', 'accessNotConfigured', 'ipRefererBlocked', 'API_KEY_INVALID', 'API_KEY_SERVICE_BLOCKED', 'API_KEY_IP_ADDRESS_BLOCKED', 'API_KEY_HTTP_REFERRER_BLOCKED', 'SERVICE_DISABLED'].includes(reason);
    super(quota ? 'The YouTube quota has been reached. Try again after the daily reset.'
      : restrictedKey ? 'YouTube rejected the API key or project configuration. Check that YouTube Data API v3 is enabled and that the key allows server requests.'
        : status === 429 ? 'YouTube is rate limiting scans. Try again shortly.'
          : 'YouTube could not complete the request. Try again shortly.', quota || status === 429 ? 429 : 502);
  }
}

export class YouTubeClient {
  private blockedUntil = 0;

  constructor(private readonly key: string) {}

  private async list<T>(resource: 'channels' | 'videos' | 'playlistItems' | 'commentThreads' | 'comments', params: Record<string, string>): Promise<List<T>> {
    if (Date.now() < this.blockedUntil) throw new YouTubeError('quotaExceeded');
    const url = new URL('https://www.googleapis.com/youtube/v3/' + resource);
    url.search = new URLSearchParams({ ...params, key: this.key }).toString();

    for (let attempt = 0; ; attempt++) {
      let failure: ScanError;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
        const body = await response.json().catch(() => null);
        if (response.ok && body && typeof body === 'object') return body;
        const reason = body?.error?.details?.find((detail: { reason?: string }) => detail.reason)?.reason
          ?? body?.error?.errors?.[0]?.reason ?? 'unavailable';
        if (['quotaExceeded', 'dailyLimitExceeded'].includes(reason)) this.blockedUntil = Date.now() + 60_000;
        failure = new YouTubeError(reason, response.status);
        if (response.status < 500 && response.status !== 429) throw failure;
      } catch (error) {
        if (error instanceof ScanError) throw error;
        failure = providerConnectionError('YouTube', error);
      }
      if (attempt === 2) throw failure;
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  async resolve(input: string): Promise<Creator | null> {
    const reference = normalizeHandle(input);
    if (!reference) return null;
    let filter: Record<string, string>;
    if (reference.kind === 'videoId') {
      const videos = await this.list<{ snippet: { channelId: string } }>('videos', { part: 'snippet', id: reference.value });
      const id = videos.items?.[0]?.snippet.channelId;
      if (!id) return null;
      filter = { id };
    } else {
      filter = reference.kind === 'handle' ? { forHandle: reference.value } : { id: reference.value };
    }
    const { items } = await this.list<ChannelResource>('channels', {
      part: 'snippet,statistics,contentDetails', ...filter
    });
    const channel = items?.[0];
    if (!channel) return null;
    return {
      id: channel.id,
      handle: channel.snippet.customUrl ?? (reference.kind === 'handle' ? reference.value : channel.id),
      title: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails?.medium?.url ?? channel.snippet.thumbnails?.default?.url ?? null,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads ?? null,
      subscriberCount: channel.statistics?.hiddenSubscriberCount || channel.statistics?.subscriberCount == null
        ? null : Number(channel.statistics.subscriberCount)
    };
  }

  async uploads(creator: Creator): Promise<Upload[]> {
    if (!creator.uploadsPlaylistId) return [];
    const { items = [] } = await this.list<{ snippet: { title: string; description: string }; contentDetails: { videoId: string; videoPublishedAt?: string } }>('playlistItems', {
      part: 'snippet,contentDetails', playlistId: creator.uploadsPlaylistId, maxResults: '6'
    });
    return items.flatMap(({ snippet, contentDetails }) => contentDetails.videoPublishedAt ? [{
      id: contentDetails.videoId, title: snippet.title, description: snippet.description, publishedAt: contentDetails.videoPublishedAt
    }] : []);
  }

  async videoStats(videoIds: string[]): Promise<Array<{ id: string; title: string; views: number }>> {
    if (!videoIds.length) return [];
    const { items = [] } = await this.list<{ id: string; snippet: { title: string }; statistics?: { viewCount?: string } }>('videos', {
      part: 'snippet,statistics',
      id: videoIds.slice(0, 10).join(',')
    });
    return items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      views: Number(item.statistics?.viewCount ?? 0)
    }));
  }

  async comments(creator: Creator, upload: Upload, since?: Date): Promise<{ comments: Comment[]; disabled: boolean }> {
    const comments: Comment[] = [];
    const cutoff = since?.getTime() ?? 0;
    let pageToken = '';
    let ownerChecks = 0;
    try {
      for (let page = 0; page < 1; page++) {
        const result: List<Thread> = await this.list<Thread>('commentThreads', {
          part: 'snippet,replies', videoId: upload.id, order: 'time', textFormat: 'plainText', maxResults: '100',
          ...(pageToken ? { pageToken } : {})
        });
        const threads = result.items ?? [];
        for (const thread of threads) {
          const { topLevelComment, totalReplyCount } = thread.snippet;
          const { authorDisplayName, publishedAt, likeCount, textOriginal, textDisplay } = topLevelComment.snippet;
          if (Date.parse(publishedAt) <= cutoff) continue;
          const rawText = textOriginal ?? textDisplay;
          const replies = thread.replies?.comments ?? [];
          let ownerReplied: boolean | null = replies.some(reply => reply.snippet.authorChannelId?.value === creator.id) ? true : false;
          if (!ownerReplied && replies.length < totalReplyCount && isQuestion(rawText) && ownerChecks < 8) {
            ownerChecks++;
            ownerReplied = await this.findOwnerReply(creator.id, topLevelComment.id);
          }
          comments.push({
            id: topLevelComment.id, videoId: upload.id, authorHandle: authorDisplayName,
            rawText, publishedAt, likeCount, replyCount: totalReplyCount, ownerReplied
          });
        }
        if (!result.nextPageToken || threads.some(thread => Date.parse(thread.snippet.topLevelComment.snippet.publishedAt) <= cutoff)) break;
        pageToken = result.nextPageToken;
      }
      return { comments, disabled: false };
    } catch (error) {
      if (error instanceof YouTubeError && error.reason === 'commentsDisabled') return { comments, disabled: true };
      throw error;
    }
  }

  private async findOwnerReply(channelId: string, parentId: string): Promise<boolean | null> {
    let pageToken = '';
    for (let page = 0; page < 2; page++) {
      const result: List<CommentResource> = await this.list<CommentResource>('comments', {
        part: 'snippet', parentId, maxResults: '100', textFormat: 'plainText', ...(pageToken ? { pageToken } : {})
      });
      if (result.items?.some(reply => reply.snippet.authorChannelId?.value === channelId)) return true;
      if (!result.nextPageToken) return false;
      pageToken = result.nextPageToken;
    }
    return null;
  }
}

import { normalizeHandle } from './normalizeHandle';
import type { Comment } from '../comments/zeroHallucinationCluster';

type ChannelResource = {
  id: string;
  snippet: { title: string; customUrl?: string };
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
export type Creator = { id: string; title: string; handle: string; uploadsPlaylistId: string | null; subscriberCount: number | null };

class YouTubeError extends Error {
  constructor(readonly reason: string) {
    super(reason === 'quotaExceeded' || reason === 'dailyLimitExceeded'
      ? 'The YouTube quota has been reached. Try again after the daily reset.'
      : 'YouTube could not complete the request. Try again shortly.');
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
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
        const body = await response.json();
        if (response.ok) return body;
        const reason = body.error?.errors?.[0]?.reason ?? 'unavailable';
        if (['quotaExceeded', 'dailyLimitExceeded'].includes(reason)) this.blockedUntil = Date.now() + 60_000;
        if (response.status < 500 && response.status !== 429) throw new YouTubeError(reason);
      } catch (error) {
        if (error instanceof YouTubeError) throw error;
      }
      if (attempt === 2) throw new YouTubeError('unavailable');
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
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads ?? null,
      subscriberCount: channel.statistics?.hiddenSubscriberCount || channel.statistics?.subscriberCount == null
        ? null : Number(channel.statistics.subscriberCount)
    };
  }

  async uploads(creator: Creator): Promise<Upload[]> {
    if (!creator.uploadsPlaylistId) return [];
    const { items = [] } = await this.list<{ snippet: { title: string; description: string }; contentDetails: { videoId: string; videoPublishedAt?: string } }>('playlistItems', {
      part: 'snippet,contentDetails', playlistId: creator.uploadsPlaylistId, maxResults: '3'
    });
    return items.flatMap(({ snippet, contentDetails }) => contentDetails.videoPublishedAt ? [{
      id: contentDetails.videoId, title: snippet.title, description: snippet.description, publishedAt: contentDetails.videoPublishedAt
    }] : []);
  }

  async comments(creator: Creator, upload: Upload, since?: Date): Promise<{ comments: Comment[]; disabled: boolean }> {
    const comments: Comment[] = [];
    const cutoff = since?.getTime() ?? 0;
    let pageToken = '';
    try {
      for (let page = 0; page < 3; page++) {
        const result: List<Thread> = await this.list<Thread>('commentThreads', {
          part: 'snippet,replies', videoId: upload.id, order: 'time', textFormat: 'plainText', maxResults: '100',
          ...(pageToken ? { pageToken } : {})
        });
        const threads = result.items ?? [];
        for (const thread of threads) {
          const { topLevelComment, totalReplyCount } = thread.snippet;
          const { authorDisplayName, publishedAt, likeCount, textOriginal, textDisplay } = topLevelComment.snippet;
          if (Date.parse(publishedAt) <= cutoff) continue;
          const replies = thread.replies?.comments ?? [];
          const ownerReplied = replies.some(reply => reply.snippet.authorChannelId?.value === creator.id)
            ? true : replies.length < totalReplyCount
              ? await this.findOwnerReply(creator.id, topLevelComment.id)
              : false;
          comments.push({
            id: topLevelComment.id, videoId: upload.id, authorHandle: authorDisplayName,
            rawText: textOriginal ?? textDisplay, publishedAt, likeCount, replyCount: totalReplyCount, ownerReplied
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

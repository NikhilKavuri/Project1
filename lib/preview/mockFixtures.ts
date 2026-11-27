import type { Comment, Topic } from '../comments/zeroHallucinationCluster';
import type { TopShortDna } from '../preview/types';
import type { Creator, Upload } from '../youtube/client';

export type MockChannelFixture = {
  creator: Creator;
  uploads: Upload[];
  comments: Comment[];
  disabled: number;
  topShortDna: TopShortDna[];
};

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

const motoComments: Comment[] = [
  { id: 'c_moto_1', videoId: 'vid_moto_1', authorHandle: '@arjun_rides', rawText: 'bhai helmet mic link dede please', likeCount: 18, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(4) },
  { id: 'c_moto_2', videoId: 'vid_moto_1', authorHandle: '@kiran_vlogs', rawText: 'Which wireless mic fits inside a full face helmet?', likeCount: 14, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(8) },
  { id: 'c_moto_3', videoId: 'vid_moto_1', authorHandle: '@ravi_teng', rawText: 'anna mic edi vadutunnav wind noise rakunda?', likeCount: 9, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(12) },
  { id: 'c_moto_4', videoId: 'vid_moto_2', authorHandle: '@speed400_fan', rawText: 'What chin mount do you use for GoPro at 110 kmph?', likeCount: 15, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(6) },
  { id: 'c_moto_5', videoId: 'vid_moto_2', authorHandle: '@rohan_m', rawText: 'bhai chin mount kitna pada aur kaha se liya?', likeCount: 11, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(16) },
  { id: 'c_moto_6', videoId: 'vid_moto_3', authorHandle: '@moto_dev', rawText: 'How is the Triumph Speed 400 first service cost?', likeCount: 12, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(10) },
  { id: 'c_moto_7', videoId: 'vid_moto_3', authorHandle: '@vikram_99', rawText: 'Speed 400 city mileage kitna deta hai?', likeCount: 7, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(20) },
  { id: 'c_moto_spam', videoId: 'vid_moto_1', authorHandle: '@bot_crypto', rawText: 'crypto profits https://t.me/fake_airdrop?', likeCount: 0, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(2) },
  { id: 'c_moto_emoji', videoId: 'vid_moto_1', authorHandle: '@fan_1', rawText: '🔥🔥🔥', likeCount: 1, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(3) }
];

const spamOnlyComments: Comment[] = [
  { id: 'c_spam_1', videoId: 'vid_spam_1', authorHandle: '@crypto_bot', rawText: 'bitcoin airdrop guaranteed profit https://t.me/scam', likeCount: 0, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(2) },
  { id: 'c_spam_2', videoId: 'vid_spam_1', authorHandle: '@emoji_fan', rawText: '🔥🔥❤️', likeCount: 2, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(3) },
  { id: 'c_spam_3', videoId: 'vid_spam_1', authorHandle: '@praise_guy', rawText: 'super bro', likeCount: 1, replyCount: 0, ownerReplied: false, publishedAt: hoursAgo(4) }
];

const competitorClusters: Array<{ id: string; topic: Topic; comments: Comment[] }> = [
  {
    id: 'comp-helmet-mic',
    topic: { topicTitle: 'Best helmet mic under 2000 for wind noise', matchedIndices: [0, 1], askCount: 2, totalLikes: 32, demandScore: 84 },
    comments: motoComments.slice(0, 2)
  },
  {
    id: 'comp-chin-mount',
    topic: { topicTitle: 'Highway-safe GoPro chin mount setup', matchedIndices: [0, 1], askCount: 2, totalLikes: 26, demandScore: 72 },
    comments: motoComments.slice(3, 5)
  },
  {
    id: 'comp-service-cost',
    topic: { topicTitle: 'Speed 400 real first service bill & mileage', matchedIndices: [0, 1], askCount: 2, totalLikes: 19, demandScore: 58 },
    comments: motoComments.slice(5, 7)
  }
];

export function getMockChannelFixture(reference: string): MockChannelFixture {
  const key = reference.trim().toLowerCase();

  if (key.includes('zerocomment') || key.includes('disabled')) {
    return {
      creator: { id: 'UC_ZERO_COMMENTS_00000001', title: 'Zero Comments Creator', handle: '@ZeroCommentsChannel', avatarUrl: null, uploadsPlaylistId: 'UU_ZERO', subscriberCount: 85 },
      uploads: [{ id: 'vid_zero_1', title: 'Triumph Speed 400 motovlog', description: 'Testing my helmet mic', publishedAt: hoursAgo(12) }],
      comments: [],
      disabled: 1,
      topShortDna: [{ title: 'Speed 400 Exhaust Note', views: 12400, outlierRatio: 145.8, wpm: 162, hookSeconds: 2.4 }]
    };
  }

  if (key.includes('spamonly')) {
    return {
      creator: { id: 'UC_SPAM_ONLY_000000000002', title: 'Spam Only Channel', handle: '@SpamOnlyChannel', avatarUrl: null, uploadsPlaylistId: 'UU_SPAM', subscriberCount: 64 },
      uploads: [{ id: 'vid_spam_1', title: 'Daily bike commute vlog', description: 'City ride with GoPro', publishedAt: hoursAgo(10) }],
      comments: spamOnlyComments,
      disabled: 0,
      topShortDna: [{ title: 'Morning Commute POV', views: 8900, outlierRatio: 139.1, wpm: 155, hookSeconds: 2.6 }]
    };
  }

  return {
    creator: {
      id: 'UC_TEST_MOTO_000000000001',
      title: 'Test Moto Channel',
      handle: reference.startsWith('@') ? reference : '@TestMotoChannel',
      avatarUrl: null,
      uploadsPlaylistId: 'UU_TEST_MOTO',
      subscriberCount: 4200
    },
    uploads: [
      { id: 'vid_moto_1', title: 'Night Ride Helmet Mic Test', description: 'Testing wireless audio on highway', publishedAt: hoursAgo(18) },
      { id: 'vid_moto_2', title: 'GoPro Chin Mount at 110 kmph', description: 'Action cam stability check', publishedAt: hoursAgo(36) },
      { id: 'vid_moto_3', title: 'Speed 400 1000km Review', description: 'City mileage and first service', publishedAt: hoursAgo(50) }
    ],
    comments: motoComments,
    disabled: 0,
    topShortDna: [
      { title: 'Why My Helmet Mic Cut Out at 100kmph', views: 184000, outlierRatio: 43.8, wpm: 168, hookSeconds: 2.1 },
      { title: '3 Chin Mount Mistakes New Riders Make', views: 96000, outlierRatio: 22.9, wpm: 160, hookSeconds: 2.5 },
      { title: 'Speed 400 First Service Bill Revealed', views: 71000, outlierRatio: 16.9, wpm: 154, hookSeconds: 2.8 }
    ]
  };
}

export function getMockCompetitorClusters() {
  return competitorClusters;
}

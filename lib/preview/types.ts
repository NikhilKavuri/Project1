export type Receipt = { id: string; author: string; text: string; likes: number; url: string | null };
export type Beat = { time: string; label: string; text: string };
export type Angle = 'Demo' | 'Mistake' | 'Price breakdown';
export type Format = 'Shorts' | 'Reels';

export type TopShortDna = {
  title: string;
  views: number;
  outlierRatio: number;
  wpm: number;
  hookSeconds: number;
};

export type HookFramework = {
  hookType: string;
  bodyCuts: string;
  loopCta: string;
};

export type Script = {
  locked?: false;
  id: string;
  title: string;
  score: number;
  questions: number;
  likes: number;
  receipts: Receipt[];
  angles: Record<Angle, Beat[]>;
  reelCta: string;
  reelCaption: string;
  reply: string;
  framework?: HookFramework;
  topShortDna?: TopShortDna;
};

export type LockedScript = {
  locked: true;
  id: string;
  title: string;
  score: number;
  questions: number;
  likes: number;
};

export type ScriptItem = Script | LockedScript;

export function isLockedScript(item: ScriptItem): item is LockedScript {
  return Boolean((item as LockedScript).locked);
}

export type ChannelMeta = {
  title: string;
  handle: string;
  avatarUrl: string | null;
  subscriberCount: number | null;
};

export type Digest = {
  id: string;
  createdAt: string;
  source: 'demo' | 'own' | 'peers';
  niche: string;
  channel?: ChannelMeta;
  scripts: ScriptItem[];
  notes: string[];
  topShortDna?: TopShortDna[];
};

export type Inspection = {
  title: string;
  handle: string;
  nicheId: string | null;
  nicheLabel?: string;
  suggestedPeers?: string[];
  message: string | null;
  needsPeers: boolean;
};

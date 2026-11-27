export type Receipt = { id: string; author: string; text: string; likes: number; url: string | null };
export type Beat = { time: string; label: string; text: string };
export type Angle = 'Demo' | 'Mistake' | 'Price breakdown';
export type Format = 'Shorts' | 'Reels';
export type Script = {
  id: string; title: string; score: number; questions: number; likes: number; receipts: Receipt[];
  angles: Record<Angle, Beat[]>; reelCta: string; reelCaption: string; reply: string;
};
export type Digest = { id: string; createdAt: string; source: 'demo' | 'own' | 'peers'; niche: string; scripts: Script[]; notes: string[] };
export type Inspection = { title: string; handle: string; nicheId: string | null; message: string | null; needsPeers: boolean };

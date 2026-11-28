import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Digest, LockedScript, Script, ScriptItem } from '../preview/types';

export type PreviewLockRecord = {
  channelKey: string;
  ip: string;
  digestId: string;
  fullScripts: Script[];
  createdAt: string;
};

export type UserAccountState = {
  userId: string;
  email: string;
  planTier: 'FREE' | 'STARTER_99' | 'PRO_199';
  subscriptionStatus: 'INACTIVE' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  razorpaySubId?: string;
  stripeSubId?: string;
  frequencyHours: number;
  preferredHourIst: number;
  triggerOnNewUpload: boolean;
  channelHandle: string;
  competitorHandles: string[];
  city?: string;
  country?: string;
  instagramUrl?: string;
  onboarded?: boolean;
  lastSyncedAt: string | null;
  nextRunAt: string;
  digests: Digest[];
  hijackQuestions?: Array<{
    id: string;
    topic: string;
    author: string;
    text: string;
    likes: number;
    url: string | null;
    potentialScore?: number;
    stealDeal?: boolean;
    reason?: string;
  }>;
};

export type PersistedAppState = {
  previewLocks: Record<string, PreviewLockRecord>;
  ipScans: Record<string, number>;
  users: Record<string, UserAccountState>;
  webhookEvents: string[];
  clusterAssignments: Record<string, string[]>;
};

const statePath = path.join(os.tmpdir(), 'clipspill-app-state.json');

function defaultState(): PersistedAppState {
  return {
    previewLocks: {},
    ipScans: {},
    users: {},
    webhookEvents: [],
    clusterAssignments: {}
  };
}

export function readAppState(): PersistedAppState {
  try {
    if (!fs.existsSync(statePath)) return defaultState();
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    return {
      previewLocks: parsed.previewLocks ?? {},
      ipScans: parsed.ipScans ?? {},
      users: parsed.users ?? {},
      webhookEvents: parsed.webhookEvents ?? [],
      clusterAssignments: parsed.clusterAssignments ?? {}
    };
  } catch {
    return defaultState();
  }
}

export function writeAppState(next: PersistedAppState): void {
  fs.writeFileSync(statePath, JSON.stringify(next, null, 2), 'utf8');
}

export function resetAppStateForTests(): void {
  writeAppState(defaultState());
}

export function redactScript(script: Script): LockedScript {
  return {
    locked: true,
    id: script.id,
    title: script.title,
    score: script.score,
    questions: script.questions,
    likes: script.likes
  };
}

export function applyPreviewRedaction(scripts: Script[]): ScriptItem[] {
  return scripts.map((script, index) => (index === 0 ? script : redactScript(script)));
}

export function getOrCreateUserState(userId: string, email = `${userId}@clipspill.local`): UserAccountState {
  const state = readAppState();
  if (!state.users[userId]) {
    const isDemo = userId === 'demo-creator';
    state.users[userId] = {
      userId,
      email,
      planTier: 'FREE',
      subscriptionStatus: 'INACTIVE',
      frequencyHours: 48,
      preferredHourIst: 9,
      triggerOnNewUpload: false,
      channelHandle: isDemo ? '@TestMotoChannel' : '',
      competitorHandles: isDemo ? ['@JSFilmsIndia'] : [],
      city: '',
      country: '',
      onboarded: isDemo,
      lastSyncedAt: null,
      nextRunAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
      digests: []
    };
    writeAppState(state);
  }
  return state.users[userId];
}

export function claimClusterForUser(clusterId: string, userId: string): boolean {
  const state = readAppState();
  const existing = new Set(state.clusterAssignments[clusterId] ?? []);
  if (existing.has(userId)) return true;
  if (existing.size >= 2) return false;
  existing.add(userId);
  state.clusterAssignments[clusterId] = [...existing];
  writeAppState(state);
  return true;
}

import { normalizeHandle } from './youtube/normalizeHandle';

export type CreatorProfile = {
  channel_handle: string;
  competitor_handles: string[];
  cadence: 'weekly' | '48h' | '72h' | 'post-upload';
  delivery_time: string;
  delivery_day: number;
  delivery_channel: 'email' | 'whatsapp';
};

export const defaultProfile: CreatorProfile = {
  channel_handle: '', competitor_handles: [], cadence: 'weekly', delivery_time: '09:00', delivery_day: 1, delivery_channel: 'email'
};

export function parseProfile(input: Partial<CreatorProfile> | null): CreatorProfile | null {
  if (!input || typeof input.channel_handle !== 'string' || input.channel_handle.length > 600 ||
    (input.channel_handle && !normalizeHandle(input.channel_handle)) ||
    !Array.isArray(input.competitor_handles) || input.competitor_handles.length > 5 ||
    input.competitor_handles.some(value => typeof value !== 'string' || normalizeHandle(value)?.kind !== 'handle') ||
    !input.cadence || !['weekly', '48h', '72h', 'post-upload'].includes(input.cadence) ||
    typeof input.delivery_time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.delivery_time) ||
    input.delivery_day === undefined || !Number.isInteger(input.delivery_day) || input.delivery_day < 0 || input.delivery_day > 6 ||
    !input.delivery_channel || !['email', 'whatsapp'].includes(input.delivery_channel)) return null;
  const handles = input.competitor_handles.map(value => normalizeHandle(value)?.value ?? value);
  return {
    channel_handle: input.channel_handle.trim(),
    competitor_handles: [...new Map(handles.map(handle => [handle.toLowerCase(), handle])).values()],
    cadence: input.cadence, delivery_time: input.delivery_time, delivery_day: input.delivery_day, delivery_channel: input.delivery_channel
  };
}

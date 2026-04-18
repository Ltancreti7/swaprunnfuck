import type { Message } from '../../shared/schema';

export function getNextRoundHour(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function parseTimeFragment(text: string): { hours: number; minutes: number } | null {
  const match = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm|a\.m\.|p\.m\.)\b/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase().replace(/\./g, '');
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return { hours, minutes };
  }
  const military = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
  if (military) {
    return { hours: parseInt(military[1], 10), minutes: parseInt(military[2], 10) };
  }
  return null;
}

function makeValidDate(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

function parseDateFragment(text: string, reference: Date): Date | null {
  const lower = text.toLowerCase();

  if (/\btoday\b/.test(lower)) {
    return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  }
  if (/\btomorrow\b|\btmrw\b|\btmr\b/.test(lower)) {
    const d = new Date(reference);
    d.setDate(d.getDate() + 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const slash = lower.match(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const month = parseInt(slash[1], 10) - 1;
    const day = parseInt(slash[2], 10);
    let year = slash[3] ? parseInt(slash[3], 10) : reference.getFullYear();
    if (year < 100) year += 2000;
    let candidate = makeValidDate(year, month, day);
    if (!candidate) return null;
    if (!slash[3] && candidate.getTime() < reference.getTime() - 86400000) {
      const bumped = makeValidDate(year + 1, month, day);
      if (bumped) candidate = bumped;
    }
    return candidate;
  }

  const monthRegex = new RegExp(
    `\\b(${Object.keys(MONTHS).join('|')})\\.?\\s+(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
    'i'
  );
  const monthMatch = lower.match(monthRegex);
  if (monthMatch) {
    const month = MONTHS[monthMatch[1].toLowerCase()];
    const day = parseInt(monthMatch[2], 10);
    const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : reference.getFullYear();
    let candidate = makeValidDate(year, month, day);
    if (!candidate) return null;
    if (!monthMatch[3] && candidate.getTime() < reference.getTime() - 86400000) {
      const bumped = makeValidDate(year + 1, month, day);
      if (bumped) candidate = bumped;
    }
    return candidate;
  }

  const weekdayRegex = new RegExp(`\\b(?:next\\s+)?(${Object.keys(WEEKDAYS).join('|')})\\b`, 'i');
  const weekdayMatch = lower.match(weekdayRegex);
  if (weekdayMatch) {
    const target = WEEKDAYS[weekdayMatch[1].toLowerCase()];
    const current = reference.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    if (/\bnext\s+/i.test(weekdayMatch[0]) && diff < 7) diff += 7;
    const d = new Date(reference);
    d.setDate(d.getDate() + diff);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  return null;
}

export function parseDateTimeFromMessages(
  messages: Message[],
  reference: Date = new Date()
): Date | null {
  const recent = messages.slice(-15).reverse();
  for (const msg of recent) {
    if (!msg?.content) continue;
    const baseDate = msg.createdAt ? new Date(msg.createdAt) : reference;
    const datePart = parseDateFragment(msg.content, baseDate);
    const timePart = parseTimeFragment(msg.content);
    if (datePart && timePart) {
      const result = new Date(datePart);
      result.setHours(timePart.hours, timePart.minutes, 0, 0);
      return result;
    }
    if (datePart) {
      const result = new Date(datePart);
      result.setHours(9, 0, 0, 0);
      return result;
    }
    if (timePart) {
      const result = new Date(reference);
      result.setHours(timePart.hours, timePart.minutes, 0, 0);
      if (result.getTime() <= reference.getTime()) {
        result.setDate(result.getDate() + 1);
      }
      return result;
    }
  }
  return null;
}

function formatIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export interface IcsEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  durationMinutes?: number;
}

export function buildIcsContent({
  title,
  description = '',
  location = '',
  start,
  durationMinutes = 60,
}: IcsEventInput): string {
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@swaprunn.com`;
  const stamp = formatIcsDate(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SwapRunn//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  if (typeof cap.getPlatform === 'function') return cap.getPlatform() !== 'web';
  return false;
}

export function downloadIcs(filename: string, content: string): void {
  const safeName = filename.endsWith('.ics') ? filename : `${filename}.ics`;

  if (isCapacitorNative()) {
    const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
    window.open(dataUrl, '_blank');
    return;
  }

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

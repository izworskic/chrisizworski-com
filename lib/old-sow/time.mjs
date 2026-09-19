export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

export function parseUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = /(?:Z|[+-]\d\d:?\d\d)$/.test(raw)
    ? raw
    : raw.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function localParts(dateInput, timeZone) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', timeZoneName: 'short'
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

export function formatLocal(dateInput, timeZone, { date = true, zone = true } = {}) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: date ? 'short' : undefined,
    month: date ? 'short' : undefined,
    day: date ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: zone ? 'short' : undefined
  }).format(d);
}

export function minutesBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export function ageMinutes(validTime, now = new Date()) {
  if (!validTime) return null;
  const t = new Date(validTime).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((now.getTime() - t) / 60000));
}

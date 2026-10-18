const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function todayTaipei(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isMarketOpen(now = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
  }).format(now);
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  const [hour, minute] = clock.split(':').map(Number);
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 && minutes <= 13 * 60 + 35;
}

export function formatDateLabel(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}（${WEEKDAYS[date.getDay()]}）`;
}

export function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatQuoteStamp(date: string, time: string) {
  if (date.length === 8) {
    return `${date.slice(4, 6)}/${date.slice(6, 8)} ${time.slice(0, 5)}`;
  }
  return time.slice(0, 5);
}

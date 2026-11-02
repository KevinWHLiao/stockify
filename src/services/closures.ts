import { closureDatesFromSchedule, rememberClosures } from '../lib/closures';

export async function refreshClosureDates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://www.twse.com.tw/holidaySchedule/holidaySchedule?response=json', { signal: controller.signal });
    if (!response.ok) return;
    rememberClosures(closureDatesFromSchedule(await response.json()));
  } catch {
    // 年度休市表讀不到時，仍用內建的假日。
  } finally {
    clearTimeout(timer);
  }
}

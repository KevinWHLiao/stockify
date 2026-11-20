import { parseInstitutional, type InstitutionalFlow } from '../lib/institutional';

export async function fetchInstitutional(): Promise<InstitutionalFlow | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json', { signal: controller.signal });
    if (!response.ok) return null;
    return parseInstitutional(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

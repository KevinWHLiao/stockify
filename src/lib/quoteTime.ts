import type { Quote } from '../types';

export function quoteStamp(quote: { date: string; time: string }) {
  return `${quote.date}${quote.time}`;
}

export function preferQuote(current: Quote | undefined, incoming: Quote): Quote {
  if (!current) return incoming;
  const incomingStamp = quoteStamp(incoming);
  const currentStamp = quoteStamp(current);
  if (incomingStamp > currentStamp) return { ...incoming, volume: incoming.volume ?? current.volume, name: incoming.name || current.name };
  if (incomingStamp < currentStamp) return { ...current, volume: current.volume ?? incoming.volume };
  return { ...current, volume: current.volume ?? incoming.volume, name: current.name || incoming.name };
}

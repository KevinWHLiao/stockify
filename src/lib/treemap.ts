export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 依權重切成區塊。較大的類股會先分到較大的一塊。 */
export function layoutTreemap(weights: number[], width: number, height: number): Box[] {
  const boxes: Box[] = weights.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  const items = weights
    .map((weight, index) => ({ weight, index }))
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const place = (row: { weight: number; index: number }[], x: number, y: number, boxWidth: number, boxHeight: number) => {
    if (row.length === 0 || boxWidth <= 0 || boxHeight <= 0) return;
    if (row.length === 1) {
      boxes[row[0].index] = { x, y, width: boxWidth, height: boxHeight };
      return;
    }
    const total = row.reduce((sum, item) => sum + item.weight, 0);
    let used = 0;
    let cut = 1;
    for (let index = 0; index < row.length - 1; index += 1) {
      used += row[index].weight;
      cut = index + 1;
      if (used >= total / 2) break;
    }
    const left = row.slice(0, cut);
    const right = row.slice(cut);
    const ratio = left.reduce((sum, item) => sum + item.weight, 0) / total;
    if (boxWidth >= boxHeight) {
      place(left, x, y, boxWidth * ratio, boxHeight);
      place(right, x + boxWidth * ratio, y, boxWidth * (1 - ratio), boxHeight);
    } else {
      place(left, x, y, boxWidth, boxHeight * ratio);
      place(right, x, y + boxHeight * ratio, boxWidth, boxHeight * (1 - ratio));
    }
  };

  place(items, 0, 0, width, height);
  return boxes;
}

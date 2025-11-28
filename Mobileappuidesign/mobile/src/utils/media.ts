export function orderMediaRowsByType<T extends { media_type: string; position?: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.media_type === b.media_type) {
      return (a.position ?? 0) - (b.position ?? 0);
    }
    return a.media_type === 'video' ? -1 : 1;
  });
}

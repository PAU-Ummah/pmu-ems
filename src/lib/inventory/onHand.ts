export function computeOnHand(layers: { remainingQty: number }[]): number {
  return layers.reduce((sum, layer) => sum + layer.remainingQty, 0);
}

export function hasExpiringSoon(
  layers: { expiryDate?: string; remainingQty: number }[],
  asOfIso: string,
  withinDays: number
): boolean {
  const asOfMs = Date.parse(asOfIso);
  const thresholdMs = asOfMs + withinDays * 24 * 60 * 60 * 1000;

  return layers.some((layer) => {
    if (layer.remainingQty <= 0) return false;
    if (!layer.expiryDate) return false;
    const expiryMs = Date.parse(layer.expiryDate);
    return expiryMs >= asOfMs && expiryMs <= thresholdMs;
  });
}

export const FREE_SHIPPING_THRESHOLD_CENTS = 100000;
export const STANDARD_SHIPPING_CENTS = 9500;

export function shippingCostCents(subtotalCents: number) {
  return subtotalCents > 0 && subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS ? STANDARD_SHIPPING_CENTS : 0;
}

import { maximumDiscount } from "./rules.js";

export function discountFor(subtotal: number): number {
  return Math.min(subtotal * 0.1, maximumDiscount());
}

export const loyaltyThreshold = 100;

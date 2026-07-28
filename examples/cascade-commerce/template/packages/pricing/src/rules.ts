import { loyaltyThreshold } from "./discounts.js";

export function maximumDiscount(): number {
  return loyaltyThreshold / 2;
}

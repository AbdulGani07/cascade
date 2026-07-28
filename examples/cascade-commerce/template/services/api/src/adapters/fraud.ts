import { riskScore } from "../internal/risk.js";

export function assessFraud(orderId: string): number {
  return riskScore(orderId);
}

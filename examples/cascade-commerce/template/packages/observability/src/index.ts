export function track(event: string): void {
  console.log(`[demo] ${event}`);
}

export function rolloutEnabled(name: string): boolean {
  return name === "recommendations";
}

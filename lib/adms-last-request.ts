/** In-process trace of the most recent ADMS callback (dev/staging troubleshooting). */
export type AdmsLastRequest = {
  at: string;
  method: string;
  path: string;
  sn: string;
  table: string | null;
  bytes: number | null;
  lineCount: number | null;
};

let lastRequest: AdmsLastRequest | null = null;

export function recordAdmsRequest(input: Omit<AdmsLastRequest, "at">): void {
  lastRequest = { ...input, at: new Date().toISOString() };
}

export function getLastAdmsRequest(): AdmsLastRequest | null {
  return lastRequest;
}

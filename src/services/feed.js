// Events fetcher (A1) — mirrors civic-hub/ui/src/services/api.ts:
// plain fetch, throw on non-2xx, unwrap the {events, count} envelope.

/**
 * Fetch the public event feed of one live source.
 * @param {{ baseUrl: string, spacePath?: string }} source
 * @returns {Promise<Array<object>>} CivicEvent[]
 */
export async function getEvents(source) {
  const url = `${source.baseUrl}${source.spacePath ?? "/events"}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status}`);
  }
  const body = await res.json();
  return Array.isArray(body.events) ? body.events : [];
}

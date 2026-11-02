// Uses the same VITE_APPS_SCRIPT_URL as the rest of the app (see .env)
const APPS_SCRIPT_URL: string | undefined = import.meta.env.VITE_APPS_SCRIPT_URL;

// Same call convention as ItineraryGenerator: POST {action, ...payload} as text/plain
export async function callApi(action: string, payload: Record<string, unknown>) {
  if (!APPS_SCRIPT_URL) throw new Error('API URL missing');
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  });
  return await res.json();
}

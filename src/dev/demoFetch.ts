import { DEMO_MODE, DEMO_WRITE_BLOCKED_EVENT } from './demoMode';
import { demoDiscoverDogs, demoParkDogs } from './demoData';

// Demo mode has no session but still talks to the live Lovable Cloud database. Plain reads
// pass through, RPCs that refuse anonymous callers get sample data, and every other write is
// refused here instead of relying on RLS alone. Import this before the Supabase client:
// supabase-js captures `fetch` when the client is created.

const SAMPLE_READS = new Map<string, unknown>([
  ['get_discover_dogs', demoDiscoverDogs],
  ['get_park_dogs', demoParkDogs],
]);

// Writes answered with their normal success shape so a flow stays usable (the Discover
// swipe). Nothing is saved, and the demo toast still says so.
const SIMULATED_WRITES = new Map<string, unknown>([
  ['send_wave', { status: 'WAVED', message: 'Demo modu' }],
]);

// Writes the app fires by itself in the background: swallow them without a toast.
const SILENT_WRITES = new Set(['update_dog_location']);

const READ_ONLY_RPCS = new Set(['is_admin']);

if (DEMO_MODE) {
  const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
  const realFetch = window.fetch.bind(window);
  const announceBlockedWrite = () => window.dispatchEvent(new Event(DEMO_WRITE_BLOCKED_EVENT));

  window.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith(supabaseUrl)) return realFetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const rpc = url.match(/\/rest\/v1\/rpc\/([^/?#]+)/)?.[1];

    if (rpc && SAMPLE_READS.has(rpc)) return Promise.resolve(Response.json(SAMPLE_READS.get(rpc)));
    if (method === 'GET' || method === 'HEAD' || (rpc && READ_ONLY_RPCS.has(rpc))) return realFetch(input, init);
    if (rpc && SILENT_WRITES.has(rpc)) return Promise.resolve(Response.json(null));

    announceBlockedWrite();
    if (rpc && SIMULATED_WRITES.has(rpc)) return Promise.resolve(Response.json(SIMULATED_WRITES.get(rpc)));

    console.warn(`[demo] blocked ${method} ${url}`);
    return Promise.resolve(
      Response.json({ message: 'Demo modunda değişiklik kaydedilmez.', code: 'DEMO_READ_ONLY' }, { status: 403 }),
    );
  };
}

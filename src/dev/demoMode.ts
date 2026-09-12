// Local-only demo mode for browsing the app without logging in: add VITE_DEMO_MODE=true
// to .env.local (gitignored). The DEV check keeps it out of production builds, and
// Lovable never receives .env.local, so its preview still requires a real login.
export const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true';

// Fired by the read-only guard so the demo UI can explain why an action did nothing.
export const DEMO_WRITE_BLOCKED_EVENT = 'demo-write-blocked';

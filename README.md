# Supabase + Vercel config check

Simple script to verify Supabase connectivity using your Vercel environment variables.

Environment variables (set these in Vercel or locally):

- `SUPABASE_URL` — your Supabase project URL (e.g. https://xxxx.supabase.co)
- `SUPABASE_ANON_KEY` — the anon/public API key
- `SUPABASE_PUBLISHABLE_KEY` — optional publishable key (if you use it)

Local quick test:

```bash
# export values locally (do NOT commit secrets)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

npm run check
```

On Vercel:

1. Go to your Project > Settings > Environment Variables.
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (and `SUPABASE_PUBLISHABLE_KEY` if needed).
3. Deploy or run a preview — the script `node check-supabase.js` can be used in serverless functions or during build to validate connectivity.

Notes:
- The script performs a simple HTTP request to the Supabase REST endpoint to verify reachability and basic auth headers. It does not expose or store your secret keys.
- Keep your keys secret and set them only in Vercel's dashboard (do not commit keys to the repo).

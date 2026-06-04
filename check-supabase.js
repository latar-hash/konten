#!/usr/bin/env node
// Simple Supabase connectivity check script for Vercel / local env
// Usage: set SUPABASE_URL and SUPABASE_ANON_KEY in environment, then `node check-supabase.js`

const { URL } = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SB_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

function missing(vars) {
  console.error('Missing required environment variables: ' + vars.join(', '));
  process.exit(2);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) missing([!SUPABASE_URL && 'SUPABASE_URL', !SUPABASE_ANON_KEY && 'SUPABASE_ANON_KEY'].filter(Boolean));

async function check() {
  try {
    const target = new URL('/rest/v1/', SUPABASE_URL).href;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    console.log('Request to:', target);
    console.log('HTTP status:', res.status);
    console.log('OK:', res.ok);
    console.log('Server header:', res.headers.get('server') || 'n/a');

    if (res.ok || (res.status >= 400 && res.status < 500)) {
      console.log('Supabase endpoint reachable and responded. Keys/config appear valid for network connectivity.');
      if (SUPABASE_PUBLISHABLE_KEY) console.log('Publishable key present in env.');
      process.exit(0);
    }

    console.error('Unexpected response from Supabase (5xx or network error).');
    process.exit(3);
  } catch (err) {
    if (err.name === 'AbortError') console.error('Request timed out (8s)');
    else console.error('Network or fetch error:', err.message || err);
    process.exit(3);
  }
}

check();

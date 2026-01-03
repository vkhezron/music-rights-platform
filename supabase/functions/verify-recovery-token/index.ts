// @ts-nocheck
import { serve } from 'https://deno.land/std@0.200.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const buildHeaders = (origin: string | null) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
});

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hashToken = async (token: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = buildHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase configuration');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), {
      status: 400,
      headers
    });
  }

  const rawUsername = (body?.username ?? '').toString().trim().toLowerCase();
  const token = (body?.token ?? '').toString().trim();

  if (!rawUsername) {
    return new Response(JSON.stringify({ error: 'USERNAME_REQUIRED' }), {
      status: 400,
      headers
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: 'RECOVERY_TOKEN_REQUIRED' }), {
      status: 400,
      headers
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, username')
    .eq('username', rawUsername)
    .maybeSingle();

  if (profileError) {
    console.error('Profile lookup failed', profileError);
    return new Response(JSON.stringify({ error: 'SERVER_LOOKUP_FAILED' }), {
      status: 500,
      headers
    });
  }

  if (!profile) {
    return new Response(JSON.stringify({ error: 'USERNAME_NOT_FOUND' }), {
      status: 404,
      headers
    });
  }

  const { data: credentials, error: credentialsError } = await serviceClient
    .from('user_recovery_credentials')
    .select('email_recovery_token_hash, email_recovery_token_expires_at, email_recovery_token_sent_at')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (credentialsError) {
    console.error('Recovery credential lookup failed', credentialsError);
    return new Response(JSON.stringify({ error: 'SERVER_LOOKUP_FAILED' }), {
      status: 500,
      headers
    });
  }

  if (!credentials?.email_recovery_token_hash) {
    return new Response(JSON.stringify({ error: 'RECOVERY_TOKEN_INVALID' }), {
      status: 400,
      headers
    });
  }

  const tokenHash = await hashToken(token);

  if (tokenHash !== credentials.email_recovery_token_hash) {
    return new Response(JSON.stringify({ error: 'RECOVERY_TOKEN_INVALID' }), {
      status: 400,
      headers
    });
  }

  if (credentials.email_recovery_token_expires_at) {
    const expiresAt = new Date(credentials.email_recovery_token_expires_at).getTime();
    if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
      return new Response(JSON.stringify({ error: 'RECOVERY_TOKEN_EXPIRED' }), {
        status: 400,
        headers
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
});

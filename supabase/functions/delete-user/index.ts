// @ts-nocheck
import { serve } from 'https://deno.land/std@0.200.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const buildHeaders = (origin: string | null) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
});

const decodeJwt = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Convert base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode base64 string
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn('Failed to decode JWT payload', error);
    return null;
  }
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = buildHeaders(origin);

  console.log('Received request:', req.method, 'from origin:', origin);

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
    console.error('Missing Supabase environment variables.');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers
    });
  }

  let accessToken = '';

  try {
    const body = await req.json();
    accessToken = (body?.token || '').trim();
  } catch (_e) {
    // ignore JSON parse errors; handled below
  }

  if (!accessToken) {
    console.warn('Missing access token in request body');
    return new Response(JSON.stringify({ error: 'missing_auth_token' }), {
      status: 401,
      headers
    });
  }

  console.log('Access token length:', accessToken.length);

  const tokenPayload = decodeJwt(accessToken);

  if (!tokenPayload?.sub) {
    console.warn('JWT payload missing subject claim. Payload:', tokenPayload);
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers
    });
  }

  console.log('Decoded user ID:', tokenPayload.sub);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(tokenPayload.sub);

  if (deleteError) {
    console.error('Failed to delete auth user:', deleteError);
    return new Response(JSON.stringify({ error: 'delete_failed' }), {
      status: 500,
      headers
    });
  }

  console.log('Successfully deleted user:', tokenPayload.sub);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
});

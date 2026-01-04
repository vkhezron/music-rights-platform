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

const hashString = async (value: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
};

const logAttempt = async (
  client: ReturnType<typeof createClient>,
  username: string,
  success: boolean,
  failureReason?: string
) => {
  try {
    await client.from('auth_attempt_log').insert({
      username,
      attempt_type: 'password_reset',
      success,
      failure_reason: failureReason ?? null,
      user_agent: 'edge-function',
      ip_address: 'edge'
    });
  } catch (error) {
    console.error('Failed to log password reset attempt', error);
  }
};

const MIN_PASSWORD_LENGTH = 8;

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
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_KEY') ??
    Deno.env.get('SERVICE_ROLE_KEY') ??
    null;

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
  const newPassword = (body?.newPassword ?? '').toString();
  const recoveryMethod = (body?.method ?? 'questions').toString();
  const answer1 = (body?.answer1 ?? '').toString();
  const answer2 = (body?.answer2 ?? '').toString();
  const recoveryCode = (body?.recoveryCode ?? '').toString();

  if (!rawUsername) {
    return new Response(JSON.stringify({ error: 'USERNAME_REQUIRED' }), {
      status: 400,
      headers
    });
  }

  const normalizedMethod = recoveryMethod.toLowerCase();
  const method = ['questions', 'code'].includes(normalizedMethod) ? normalizedMethod : 'questions';

  if (method === 'questions') {
    if (!answer1.trim() || !answer2.trim()) {
      return new Response(JSON.stringify({ error: 'RECOVERY_ANSWERS_REQUIRED' }), {
        status: 400,
        headers
      });
    }
  }

  if (method === 'code') {
    if (!recoveryCode.trim()) {
      return new Response(JSON.stringify({ error: 'RECOVERY_CODE_REQUIRED' }), {
        status: 400,
        headers
      });
    }
  }

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return new Response(JSON.stringify({ error: 'PASSWORD_TOO_SHORT' }), {
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
    return new Response(
      JSON.stringify({
        error: 'SERVER_LOOKUP_FAILED',
        source: 'profile',
        details: typeof profileError === 'object' ? profileError : String(profileError)
      }),
      {
      status: 500,
      headers
      }
    );
  }

  if (!profile) {
    return new Response(JSON.stringify({ error: 'USERNAME_NOT_FOUND' }), {
      status: 404,
      headers
    });
  }

  const { data: credentials, error: credentialsError } = await serviceClient
    .from('user_recovery_credentials')
    .select(
      'recovery_codes_hash, used_recovery_codes, security_answer_1_hash, security_answer_2_hash'
    )
    .eq('user_id', profile.id)
    .maybeSingle();

  if (credentialsError) {
    console.error('Recovery credential lookup failed', credentialsError);
    return new Response(
      JSON.stringify({
        error: 'SERVER_LOOKUP_FAILED',
        source: 'credentials',
        details: typeof credentialsError === 'object' ? credentialsError : String(credentialsError)
      }),
      {
      status: 500,
      headers
      }
    );
  }

  if (method === 'questions') {
    const expected1 = (credentials as any)?.security_answer_1_hash;
    const expected2 = (credentials as any)?.security_answer_2_hash;
    if (!expected1 || !expected2) {
      await logAttempt(serviceClient, rawUsername, false, 'RECOVERY_NOT_SETUP');
      return new Response(JSON.stringify({ error: 'RECOVERY_NOT_SETUP' }), {
        status: 400,
        headers
      });
    }

    const a1 = await hashString(answer1.toLowerCase().trim());
    const a2 = await hashString(answer2.toLowerCase().trim());

    if (a1 !== expected1 || a2 !== expected2) {
      await logAttempt(serviceClient, rawUsername, false, 'INVALID_ANSWERS');
      return new Response(JSON.stringify({ error: 'INCORRECT_ANSWERS' }), {
        status: 400,
        headers
      });
    }
  }

  if (method === 'code') {
    const hashes: string[] = Array.isArray((credentials as any)?.recovery_codes_hash)
      ? (credentials as any).recovery_codes_hash
      : [];
    const used: string[] = Array.isArray((credentials as any)?.used_recovery_codes)
      ? (credentials as any).used_recovery_codes
      : [];
    if (!Array.isArray(hashes)) {
      await logAttempt(serviceClient, rawUsername, false, 'RECOVERY_NOT_SETUP');
      return new Response(JSON.stringify({ error: 'RECOVERY_NOT_SETUP' }), {
        status: 400,
        headers
      });
    }

    const normalizedCode = recoveryCode.trim().toUpperCase();
    const codeHash = await hashString(normalizedCode);
    const isValid = hashes.includes(codeHash);
    if (!isValid) {
      await logAttempt(serviceClient, rawUsername, false, 'INVALID_CODE');
      return new Response(JSON.stringify({ error: 'INVALID_RECOVERY_CODE' }), {
        status: 400,
        headers
      });
    }

    if (used.includes(codeHash)) {
      await logAttempt(serviceClient, rawUsername, false, 'CODE_ALREADY_USED');
      return new Response(JSON.stringify({ error: 'RECOVERY_CODE_ALREADY_USED' }), {
        status: 400,
        headers
      });
    }

    const updatedUsed = [...used, codeHash];
    const { error: markUsedError } = await serviceClient
      .from('user_recovery_credentials')
      .update({ used_recovery_codes: updatedUsed })
      .eq('user_id', profile.id);

    if (markUsedError) {
      console.error('Failed to mark recovery code as used', markUsedError);
    }
  }

  const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(profile.id, {
    password: newPassword
  });

  if (updateAuthError) {
    console.error('Failed to update auth password', updateAuthError);
    const failureDetail =
      typeof updateAuthError === 'object' && updateAuthError !== null
        ? (updateAuthError as any).message || (updateAuthError as any).error_description || null
        : null;
    await logAttempt(serviceClient, rawUsername, false, 'PASSWORD_UPDATE_FAILED');
    return new Response(
      JSON.stringify({
        error: 'PASSWORD_UPDATE_FAILED',
        details: failureDetail ?? undefined
      }),
      {
      status: 500,
      headers
      }
    );
  }

  const nowIso = new Date().toISOString();

  const { error: updateProfileError } = await serviceClient
    .from('profiles')
    .update({
      last_password_change_at: nowIso,
      failed_login_attempts: 0
    })
    .eq('id', profile.id);

  if (updateProfileError) {
    console.error('Failed to update profile after password reset', updateProfileError);
  }

  await logAttempt(serviceClient, rawUsername, true);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
});

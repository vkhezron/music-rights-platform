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

const generateToken = () => {
  const base = crypto.randomUUID().replace(/-/g, '');
  const extra = crypto.randomUUID().replace(/-/g, '');
  return `${base}${extra}`;
};

const buildEmailHtml = (displayName: string, username: string, resetLink: string) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
    <h2 style="color: #111827;">Password recovery request</h2>
    <p>Hi ${displayName || username},</p>
    <p>We received a request to reset the password for your Music Rights Platform account.</p>
    <p style="margin-top: 16px; margin-bottom: 16px;">
      <a href="${resetLink}" style="display: inline-block; padding: 12px 16px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
        Reset your password
      </a>
    </p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
    <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">This link expires in 30 minutes.</p>
  </div>
`;

const buildEmailText = (displayName: string, username: string, resetLink: string) => {
  const name = displayName || username;
  return [
    `Hi ${name},`,
    '',
    'We received a request to reset the password for your Music Rights Platform account.',
    '',
    `Reset your password: ${resetLink}`,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    'This link expires in 30 minutes.'
  ].join('\n');
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
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailSender = Deno.env.get('RECOVERY_EMAIL_FROM');
  const fallbackRedirect = Deno.env.get('RECOVERY_EMAIL_REDIRECT_URL');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase configuration');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers
    });
  }

  if (!resendApiKey || !emailSender) {
    console.error('Email provider not configured (RESEND_API_KEY or RECOVERY_EMAIL_FROM missing).');
    return new Response(JSON.stringify({ error: 'EMAIL_PROVIDER_NOT_CONFIGURED' }), {
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

  const username = (body?.username ?? '').toString().trim().toLowerCase();
  const locale = (body?.locale ?? 'en').toString().substring(0, 5);
  const redirectUrl = (body?.redirectUrl ?? fallbackRedirect ?? '').toString();

  if (!username) {
    return new Response(JSON.stringify({ error: 'USERNAME_REQUIRED' }), {
      status: 400,
      headers
    });
  }

  if (!redirectUrl) {
    console.error('Missing redirect URL for recovery email');
    return new Response(JSON.stringify({ error: 'RECOVERY_REDIRECT_UNCONFIGURED' }), {
      status: 500,
      headers
    });
  }

  let resetUrl: URL;
  try {
    resetUrl = new URL(redirectUrl);
  } catch (error) {
    console.error('Invalid redirect URL provided', redirectUrl, error);
    return new Response(JSON.stringify({ error: 'RECOVERY_REDIRECT_INVALID' }), {
      status: 500,
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
    .select('id, username, display_name, recovery_email')
    .eq('username', username)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to lookup profile for username', username, profileError);
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

  if (!profile.recovery_email) {
    return new Response(JSON.stringify({ error: 'NO_RECOVERY_EMAIL' }), {
      status: 400,
      headers
    });
  }

  const { data: credentials, error: credentialsError } = await serviceClient
    .from('user_recovery_credentials')
    .select('id, user_id, email_recovery_attempts, email_recovery_token_sent_at, recovery_email_verified, recovery_email_verified_at')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (credentialsError) {
    console.error('Failed to fetch recovery credentials', credentialsError);
    return new Response(JSON.stringify({ error: 'SERVER_LOOKUP_FAILED' }), {
      status: 500,
      headers
    });
  }

  if (!credentials) {
    return new Response(JSON.stringify({ error: 'RECOVERY_NOT_SETUP' }), {
      status: 400,
      headers
    });
  }

  if (credentials.email_recovery_token_sent_at) {
    const sentAt = new Date(credentials.email_recovery_token_sent_at).getTime();
    const now = Date.now();
    const throttleWindowMs = 60 * 1000; // 1 minute throttle
    if (!Number.isNaN(sentAt) && now - sentAt < throttleWindowMs) {
      return new Response(JSON.stringify({ error: 'RECOVERY_EMAIL_THROTTLED' }), {
        status: 429,
        headers
      });
    }
  }

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
  const sentAt = new Date().toISOString();
  const attempts = Number(credentials.email_recovery_attempts ?? 0) + 1;

  const updatePayload: Record<string, unknown> = {
    email_recovery_token_hash: tokenHash,
    email_recovery_token_expires_at: expiresAt,
    email_recovery_token_sent_at: sentAt,
    email_recovery_attempts: attempts
  };

  if (!credentials.recovery_email_verified) {
    updatePayload['recovery_email_verified'] = true;
    updatePayload['recovery_email_verified_at'] = sentAt;
  }

  const { error: updateError } = await serviceClient
    .from('user_recovery_credentials')
    .update(updatePayload)
    .eq('user_id', profile.id);

  if (updateError) {
    console.error('Failed to persist email recovery token', updateError);
    return new Response(JSON.stringify({ error: 'RECOVERY_TOKEN_SAVE_FAILED' }), {
      status: 500,
      headers
    });
  }

  resetUrl.searchParams.set('token', token);
  resetUrl.searchParams.set('username', profile.username);
  resetUrl.searchParams.set('locale', locale);
  const resetLink = resetUrl.toString();

  const emailBody = {
    from: emailSender,
    to: [profile.recovery_email],
    subject: 'Reset your Music Rights Platform password',
    html: buildEmailHtml(profile.display_name, profile.username, resetLink),
    text: buildEmailText(profile.display_name, profile.username, resetLink)
  };

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify(emailBody)
  });

  if (!resendResponse.ok) {
    const errorPayload = await resendResponse.text();
    console.error('Failed to send recovery email', resendResponse.status, errorPayload);
    return new Response(JSON.stringify({ error: 'RECOVERY_EMAIL_FAILED' }), {
      status: 502,
      headers
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
});

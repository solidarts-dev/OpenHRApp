// Solid Arts HR — Admin Set Password Edge Function
// Lets an ADMIN or HR user set a new login password for an employee in their own
// organization. Uses the service role, because supabase.auth.updateUser() in the
// browser can only change the password of whoever is signed in.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError(401, 'Missing Authorization header');

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !caller) return jsonError(401, 'Invalid token');

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', caller.id)
    .single();
  if (!callerProfile) return jsonError(403, 'Caller profile not found');
  if (!['ADMIN', 'HR', 'SUPER_ADMIN'].includes(callerProfile.role)) {
    return jsonError(403, 'Only ADMIN or HR can set employee passwords');
  }

  let body: { userId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON body');
  }
  const userId = (body.userId ?? '').trim();
  const password = body.password ?? '';
  if (!userId) return jsonError(400, 'Missing userId');
  if (password.length < 8) return jsonError(400, 'Password must be at least 8 characters');

  // The employee must belong to the caller's organization (Super Admins may set any).
  const { data: target } = await adminClient
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();
  if (!target) return jsonError(404, 'Employee not found');
  if (callerProfile.role !== 'SUPER_ADMIN' && target.organization_id !== callerProfile.organization_id) {
    return jsonError(403, 'This employee is not in your organization');
  }

  const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
    password,
    // An admin-set password is meant to work straight away.
    email_confirm: true,
  });
  if (updErr) return jsonError(400, 'Could not set password: ' + updErr.message);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

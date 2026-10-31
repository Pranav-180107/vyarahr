// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Initialize client with authorization header of the caller to verify permissions
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get the calling user details
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing or invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch the caller's profile to verify they are an admin or superadmin
    let isAdmin = false;
    let isSuperAdmin = false;
    const primaryAdmins = ['praveen12rangasamy@gmail.com', 'pranavanandan18@gmail.com', 'pranavananthan18@gmail.com', 'jin@gmail.com'];
    const superAdmins = ['superadmin@vyarahr.com', 'superadmin@gmail.com'];

    if (user.email && superAdmins.includes(user.email.trim().toLowerCase())) {
      isSuperAdmin = true;
      isAdmin = true;
    } else if (user.email && primaryAdmins.includes(user.email.trim().toLowerCase())) {
      isAdmin = true;
      isSuperAdmin = true;
    } else {
      const { data: callerProfile, error: profileErr } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profileErr) {
        if (callerProfile?.role === 'superadmin') {
          isSuperAdmin = true;
          isAdmin = true;
        } else if (callerProfile?.role === 'admin') {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required to create employees' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse request payload
    const payload = await req.json()
    const { action, email, password, full_name, designation, gross_salary, employee_id, role } = payload
    const targetRole = role === 'admin' ? 'admin' : 'employee';

    if (targetRole === 'admin' && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only Super Admin can create Admin accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    if (action === 'delete_all_past_data') {
      // 1. Delete from child tables referencing profiles
      const { error: attErr } = await supabaseAdmin.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: leaveErr } = await supabaseAdmin.from('leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: assetErr } = await supabaseAdmin.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: loanErr } = await supabaseAdmin.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: payrollErr } = await supabaseAdmin.from('payroll_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: taxErr } = await supabaseAdmin.from('tax_declarations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: resignErr } = await supabaseAdmin.from('resignations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Reset calendar events to default government holidays
      const { error: calDeleteErr } = await supabaseAdmin.from('calendar_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const defaultHolidays = [
        { id: 'gov-holiday-1', title: 'New Year\'s Day 🎆', description: 'Official holiday for the first day of the year.', date: '2026-01-01', category: 'Company Holidays', location: 'National Holiday', is_custom: false },
        { id: 'gov-holiday-2', title: 'Republic Day 🇮🇳', description: 'Honors the date on which the Constitution of India came into effect.', date: '2026-01-26', category: 'Company Holidays', location: 'National Holiday', is_custom: false },
        { id: 'gov-holiday-3', title: 'Good Friday ✝️', description: 'Christian holiday commemorating the crucifixion of Jesus Christ.', date: '2026-04-03', category: 'Company Holidays', location: 'Gazetted Holiday', is_custom: false },
        { id: 'gov-holiday-4', title: 'May Day / Labour Day 🛠️', description: 'Celebration of workers and laborers.', date: '2026-05-01', category: 'Company Holidays', location: 'Gazetted Holiday', is_custom: false },
        { id: 'gov-holiday-5', title: 'Independence Day 🇮🇳', description: 'Commemorates the nation\'s independence.', date: '2026-08-15', category: 'Company Holidays', location: 'National Holiday', is_custom: false },
        { id: 'gov-holiday-6', title: 'Gandhi Jayanti 👓', description: 'Birthday of Mahatma Gandhi.', date: '2026-10-02', category: 'Company Holidays', location: 'National Holiday', is_custom: false },
        { id: 'gov-holiday-7', title: 'Diwali / Deepavali 🪔', description: 'Festival of lights.', date: '2026-11-08', category: 'Company Holidays', location: 'Gazetted Holiday', is_custom: false },
        { id: 'gov-holiday-8', title: 'Christmas Day 🎄', description: 'Annual festival commemorating the birth of Jesus Christ.', date: '2026-12-25', category: 'Company Holidays', location: 'National Holiday', is_custom: false }
      ];
      const { error: calInsertErr } = await supabaseAdmin.from('calendar_events').insert(defaultHolidays);

      // 2. Delete from profiles (except admin)
      const { error: profErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .not('email', 'in', `(${primaryAdmins.join(',')})`);

      // 3. List and delete users from Supabase Auth
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!listErr && listData && listData.users) {
        for (const u of listData.users) {
          if (u.email && !primaryAdmins.includes(u.email.trim().toLowerCase())) {
            await supabaseAdmin.auth.admin.deleteUser(u.id);
          }
        }
      }

      if (attErr || leaveErr || profErr || assetErr || loanErr || payrollErr || taxErr || resignErr || calDeleteErr || calInsertErr) {
        const errors = [
          attErr?.message,
          leaveErr?.message,
          assetErr?.message,
          loanErr?.message,
          payrollErr?.message,
          taxErr?.message,
          resignErr?.message,
          calDeleteErr?.message,
          calInsertErr?.message,
          profErr?.message
        ].filter(Boolean).join(' | ');


        return new Response(JSON.stringify({ 
          error: `Deletion failed: ${errors}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, message: 'All past employee profiles, attendance, leaves, assets, and auth users deleted successfully.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email || !password || !full_name || !employee_id) {
      return new Response(JSON.stringify({ error: 'Missing required employee details' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Check if user already exists in Supabase Auth first
    let userId: string | null = null;

    // Try listing users to find one with matching email
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = listData?.users?.find((u: any) => u.email === email);

    if (existingAuthUser) {
      // User already exists in Auth — reuse their ID and update their password
      userId = existingAuthUser.id;
      // Update password in case it was different
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    } else {
      // Create a fresh Auth user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: targetRole }
      });

      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ error: createErr?.message || 'Failed to create Auth user' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = newUser.user.id;
    }

    // 5. Upsert the profile into the public.profiles table
    // gross_salary from onboarding is saved here so payroll picks it up automatically
    const { error: upsertErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        employee_id,
        full_name,
        email,
        role: targetRole,
        designation: designation || (targetRole === 'admin' ? 'HR Administrator' : 'Employee'),
        department: targetRole === 'admin' ? 'HR' : 'Unassigned',
        hired_by: user.email,
        password: password,
        gross_salary: gross_salary ? Number(gross_salary) : 0
      }, { onConflict: 'id' });

    if (upsertErr) {
      // Only clean up auth user if we just created it (not if it pre-existed)
      if (!existingAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(JSON.stringify({ error: `Profile creation failed: ${upsertErr.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Send automatic welcome email to the new employee
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'VyaraHR <onboarding@vyarahr.space>',
            to: [email],
            subject: 'Welcome to VyaraHR!',
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear ${full_name},</p>
                <p>Welcome to VyaraHR! Your account has been created successfully.</p>
                <p><strong>Login Details:</strong></p>
                <div style="background: #f9f9f9; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>Login URL:</strong> <a href="https://www.vyarahr.space/" style="color: #ff5900; text-decoration: none;">https://www.vyarahr.space/</a></p>
                  <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
                </div>
                <p>Please log in and change your password after your first login.</p>
                <p>Thank you for choosing VyaraHR.</p>
                <p style="margin-top: 25px;">Regards,<br/><strong>VyaraHR Team</strong></p>
              </div>
            `
          })
        });
      } catch (err) {
        console.error('Failed to send welcome email:', err);
      }
    }

    return new Response(JSON.stringify({ success: true, userId: userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

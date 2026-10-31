
/**
 * Resend Email Utility
 * 
 * Note: Resend's API strictly forbids browser-side requests due to security (API key exposure)
 * and CORS policy. This utility is designed for server-side use or development testing only.
 * 
 * In a production environment, you should move this logic to a Supabase Edge Function
 * or a server-side route.
 */

import { supabase } from './supabase';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: string }>; // base64 encoded content
}

export const sendEmail = async ({ to, subject, html, from, attachments }: SendEmailParams) => {
  try {
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

    // Use local proxy to bypass CORS if API key is available directly (only in development)
    if (resendApiKey && import.meta.env.DEV) {
      const res = await fetch('/api/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: from || 'VyaraHR <onboarding@vyarahr.space>',
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          attachments
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send email via proxy');
      }
      return { success: true, data };
    }

    // Fallback to Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, from, attachments },
    });

    if (error) {
      console.error('Edge Function Error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Network Error while sending email:', error);
    return { success: false, error: error.message || 'Network error' };
  }
};

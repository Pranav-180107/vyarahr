import { masterSupabase } from '../lib/supabase';
import type { AuditLog } from '../types/tenant';

export const auditService = {
  async getAll(): Promise<AuditLog[]> {
    const { data, error } = await masterSupabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as AuditLog[]) || [];
  },

  async log(action: string, actorEmail: string, actorRole: string, targetType?: string, targetId?: string, metadata?: any): Promise<void> {
    const logEntry = {
      action,
      actor_email: actorEmail,
      actor_role: actorRole,
      target_type: targetType,
      target_id: targetId,
      metadata,
      created_at: new Date().toISOString()
    };

    const { error } = await masterSupabase
      .from('audit_logs')
      .insert(logEntry);

    if (error) {
      console.error('Failed to write platform audit log:', error);
    }
  }
};

import { masterSupabase } from '../lib/supabase';
import type { TenantConnection } from '../types/tenant';

export const tenantService = {
  async getAll(): Promise<TenantConnection[]> {
    const { data, error } = await masterSupabase
      .from('tenant_connections')
      .select('*')
      .order('company_name', { ascending: true });

    if (error) throw error;
    return (data as unknown as TenantConnection[]) || [];
  },

  async getBySlug(slug: string): Promise<TenantConnection | null> {
    const { data, error } = await masterSupabase
      .from('tenant_connections')
      .select('*')
      .eq('company_slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as TenantConnection | null;
  },

  async create(connection: Omit<TenantConnection, 'id' | 'created_at'>): Promise<TenantConnection> {
    const { data, error } = await masterSupabase
      .from('tenant_connections')
      .insert(connection)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TenantConnection;
  },

  async update(id: string, updates: Partial<TenantConnection>): Promise<TenantConnection> {
    const { data, error } = await masterSupabase
      .from('tenant_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TenantConnection;
  },

  async delete(id: string): Promise<void> {
    const { error } = await masterSupabase
      .from('tenant_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

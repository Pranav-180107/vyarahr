import { masterSupabase } from '../lib/supabase';
import type { Organization } from '../types/tenant';

export const organizationService = {
  async getAll(): Promise<Organization[]> {
    const { data, error } = await masterSupabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as unknown as Organization[]) || [];
  },

  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await masterSupabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as Organization | null;
  },

  async getBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await masterSupabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as Organization | null;
  },

  async create(org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    const { data, error } = await masterSupabase
      .from('organizations')
      .insert(org)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Organization;
  },

  async update(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await masterSupabase
      .from('organizations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Organization;
  },

  async delete(id: string): Promise<void> {
    const { error } = await masterSupabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

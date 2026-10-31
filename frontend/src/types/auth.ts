export type UserRole = 'superadmin' | 'owner' | 'admin' | 'employee' | 'platform_admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  designation?: string;
  department?: string;
  employee_id?: string;
  status?: 'active' | 'inactive';
  hired_by?: string;
}

export interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: 'platform_admin' | 'platform_viewer';
  is_active: boolean;
  created_at: string;
}

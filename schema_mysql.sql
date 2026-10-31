-- =============================================================================
-- VyaraHR Native MySQL Database Schema & Bootstrapping Script
-- Fully Compatible with Hostinger MySQL 8.x / MariaDB
-- Native Self-Hosted Multi-Tenant Architecture
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Master Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(64) NOT NULL DEFAULT 'superadmin',
  `full_name` VARCHAR(255) NOT NULL DEFAULT 'Super Administrator',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tenant Mappings Directory
CREATE TABLE IF NOT EXISTS `tenant_mappings` (
  `slug` VARCHAR(64) NOT NULL PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL,
  `schema_name` VARCHAR(64) NOT NULL DEFAULT 'public',
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Organizations Directory
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `slug` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `country` VARCHAR(64) DEFAULT 'India',
  `timezone` VARCHAR(64) DEFAULT 'Asia/Kolkata',
  `currency` VARCHAR(16) DEFAULT 'INR',
  `logo_url` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `plan` VARCHAR(32) NOT NULL DEFAULT 'enterprise',
  `payment_status` VARCHAR(32) NOT NULL DEFAULT 'paid',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Customer Accounts Directory
CREATE TABLE IF NOT EXISTS `customer_accounts` (
  `id` VARCHAR(128) NOT NULL PRIMARY KEY,
  `tenant_slug` VARCHAR(64) NOT NULL,
  `contact_name` VARCHAR(255),
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(64),
  `plan_tier` VARCHAR(64) NOT NULL DEFAULT 'enterprise',
  `billing_cycle` VARCHAR(32) NOT NULL DEFAULT 'annual',
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(32) NOT NULL DEFAULT 'paid',
  `onboarded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cust_slug` (`tenant_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Platform Users Directory
CREATE TABLE IF NOT EXISTS `platform_users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL DEFAULT 'Super Administrator',
  `role` VARCHAR(64) NOT NULL DEFAULT 'platform_admin',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_platform_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Platform Owners Directory
CREATE TABLE IF NOT EXISTS `platform_owners` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(64) NOT NULL DEFAULT 'superadmin',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Platform Settings
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` VARCHAR(128) NOT NULL PRIMARY KEY,
  `setting_key` VARCHAR(128) NOT NULL UNIQUE,
  `setting_value` LONGTEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Global Settings
CREATE TABLE IF NOT EXISTS `global_settings` (
  `setting_key` VARCHAR(128) NOT NULL PRIMARY KEY,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Access Requests Directory
CREATE TABLE IF NOT EXISTS `access_requests` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `work_email` VARCHAR(255),
  `email` VARCHAR(255),
  `company_name` VARCHAR(255) NOT NULL,
  `company_size` VARCHAR(64),
  `phone` VARCHAR(64),
  `requested_slug` VARCHAR(64),
  `offer_letter_url` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  `reviewed_by` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. HR Registrations Directory
CREATE TABLE IF NOT EXISTS `hr_registrations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `org_name` VARCHAR(255),
  `org_email` VARCHAR(255),
  `phone` VARCHAR(64),
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `offer_letter_url` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Membership Payments
CREATE TABLE IF NOT EXISTS `membership_payments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `tenant_slug` VARCHAR(64) NOT NULL,
  `plan_tier` VARCHAR(64),
  `billing_cycle` VARCHAR(32),
  `amount` DECIMAL(12, 2) DEFAULT 0.00,
  `proof_path` TEXT,
  `submitted_by_name` VARCHAR(255),
  `submitted_by_email` VARCHAR(255),
  `utr_number` VARCHAR(128),
  `invoice_number` VARCHAR(128),
  `invoice_pdf_path` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `reviewed_at` TIMESTAMP NULL,
  `reviewed_by` VARCHAR(255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `tenant_slug` VARCHAR(64),
  `actor_email` VARCHAR(255),
  `action` VARCHAR(128) NOT NULL,
  `details` LONGTEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Profiles (Operational HR Employee & Admin records)
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) UNIQUE,
  `first_name` VARCHAR(128) DEFAULT 'Admin',
  `last_name` VARCHAR(128) DEFAULT 'User',
  `full_name` VARCHAR(255) DEFAULT 'Admin User',
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` TEXT,
  `password_hash` TEXT,
  `phone` VARCHAR(64),
  `role` VARCHAR(64) NOT NULL DEFAULT 'superadmin',
  `department` VARCHAR(128) DEFAULT 'Management',
  `designation` VARCHAR(128) DEFAULT 'Super Administrator',
  `gross_salary` DECIMAL(12, 2) DEFAULT 0.00,
  `hired_by` VARCHAR(255),
  `date_of_joining` DATE,
  `avatar_url` TEXT,
  `emergency_contact` LONGTEXT,
  `employment_status` VARCHAR(32) DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_profiles_email` (`email`),
  INDEX `idx_profiles_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `date` DATE NOT NULL,
  `check_in` TIMESTAMP NULL,
  `check_out` TIMESTAMP NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'present',
  `work_hours` DECIMAL(4, 2),
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_attendance_date` (`date`),
  INDEX `idx_attendance_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Leave Requests
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `leave_type` VARCHAR(64) NOT NULL DEFAULT 'Casual Leave',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `days_count` DECIMAL(4, 1) NOT NULL DEFAULT 1.0,
  `reason` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `applied_on` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` VARCHAR(64) NULL,
  `reviewed_at` TIMESTAMP NULL,
  `rejection_reason` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_leave_emp` (`employee_id`),
  INDEX `idx_leave_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Payroll Runs
CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `month` VARCHAR(32) NOT NULL,
  `year` INT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `total_gross` DECIMAL(12, 2) DEFAULT 0.00,
  `total_deductions` DECIMAL(12, 2) DEFAULT 0.00,
  `total_net` DECIMAL(12, 2) DEFAULT 0.00,
  `processed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Loans
CREATE TABLE IF NOT EXISTS `loans` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `term_months` INT NOT NULL DEFAULT 12,
  `monthly_emi` DECIMAL(12, 2) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `disbursed_at` DATE,
  `reason` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_loans_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Tax Declarations
CREATE TABLE IF NOT EXISTS `tax_declarations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `financial_year` VARCHAR(32) NOT NULL,
  `regime` VARCHAR(32) NOT NULL DEFAULT 'new',
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `details` LONGTEXT,
  `submitted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tax_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Calendar Events
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `event_type` VARCHAR(64) DEFAULT 'general',
  `start_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_company_wide` TINYINT(1) DEFAULT 1,
  `created_by` VARCHAR(64),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Assets
CREATE TABLE IF NOT EXISTS `assets` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `asset_name` VARCHAR(255) NOT NULL,
  `serial_number` VARCHAR(128),
  `category` VARCHAR(128) DEFAULT 'Hardware',
  `assigned_to` VARCHAR(64),
  `status` VARCHAR(32) DEFAULT 'assigned',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Resignations
CREATE TABLE IF NOT EXISTS `resignations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `notice_date` DATE NOT NULL,
  `last_working_day` DATE NOT NULL,
  `reason` TEXT,
  `status` VARCHAR(32) DEFAULT 'submitted',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Employee Documents
CREATE TABLE IF NOT EXISTS `employee_documents` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `document_name` VARCHAR(255) NOT NULL,
  `file_url` TEXT NOT NULL,
  `category` VARCHAR(128) DEFAULT 'General',
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Support Tickets
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(64) DEFAULT 'general',
  `priority` VARCHAR(32) DEFAULT 'medium',
  `status` VARCHAR(32) DEFAULT 'open',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `recipient_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SEED INITIAL DATA (Default Super Admin & Baseline Company)
-- Password for all default accounts is '123456'
-- =============================================================================

-- Seed Super Admin user in users table
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `full_name`)
VALUES ('usr-admin-001', 'admin@example.com', '$2b$10$wQIl4EGjXUxrKrixVMHnFe2YDQzsuGlnHrmeY5Hrfa4un/bbVlmIW', 'superadmin', 'Super Administrator')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `role` = VALUES(`role`), `full_name` = VALUES(`full_name`);

-- Backup admin account
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `full_name`)
VALUES ('usr-admin-002', 'admin@vyarahr.com', '$2b$10$wQIl4EGjXUxrKrixVMHnFe2YDQzsuGlnHrmeY5Hrfa4un/bbVlmIW', 'superadmin', 'Platform Administrator')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

-- Seed Super Admin in profiles table
INSERT INTO `profiles` (`id`, `employee_id`, `first_name`, `last_name`, `full_name`, `email`, `password`, `password_hash`, `role`, `department`, `designation`)
VALUES ('usr-admin-001', 'EMP-001', 'Super', 'Admin', 'Super Administrator', 'admin@example.com', '123456', '$2b$10$wQIl4EGjXUxrKrixVMHnFe2YDQzsuGlnHrmeY5Hrfa4un/bbVlmIW', 'superadmin', 'Management', 'Super Administrator')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `role` = VALUES(`role`);

-- Seed Platform Users
INSERT INTO `platform_users` (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`)
VALUES ('usr-admin-001', 'admin@example.com', '$2b$10$wQIl4EGjXUxrKrixVMHnFe2YDQzsuGlnHrmeY5Hrfa4un/bbVlmIW', 'Super Administrator', 'platform_admin', 1)
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

INSERT INTO `platform_users` (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`)
VALUES ('usr-admin-002', 'admin@vyarahr.com', '$2b$10$wQIl4EGjXUxrKrixVMHnFe2YDQzsuGlnHrmeY5Hrfa4un/bbVlmIW', 'Platform Administrator', 'platform_admin', 1)
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

-- Seed Platform Owners
INSERT INTO `platform_owners` (`id`, `email`, `password_hash`, `role`)
VALUES ('usr-admin-001', 'admin@example.com', '$2b$10$wQIl4EGjXUxrKrixVMHnFe2YDQzsuGlnHrmeY5Hrfa4un/bbVlmIW', 'superadmin')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

-- Seed Initial Default Organizations & Mappings
INSERT INTO `tenant_mappings` (`slug`, `company_name`, `schema_name`, `status`)
VALUES ('default', 'Vyara HR Global', 'public', 'active')
ON DUPLICATE KEY UPDATE `company_name` = VALUES(`company_name`), `status` = 'active';

INSERT INTO `tenant_mappings` (`slug`, `company_name`, `schema_name`, `status`)
VALUES ('marabanu', 'Marbanu', 'public', 'active')
ON DUPLICATE KEY UPDATE `company_name` = VALUES(`company_name`), `status` = 'active';

INSERT INTO `organizations` (`id`, `slug`, `name`, `country`, `status`, `plan`, `payment_status`)
VALUES ('org-default-001', 'default', 'Vyara HR Global', 'India', 'active', 'enterprise', 'paid')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = 'active';

INSERT INTO `organizations` (`id`, `slug`, `name`, `country`, `status`, `plan`, `payment_status`)
VALUES ('org-marabanu-001', 'marabanu', 'Marbanu', 'India', 'active', 'enterprise', 'paid')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = 'active';

INSERT INTO `customer_accounts` (`id`, `tenant_slug`, `contact_name`, `contact_email`, `plan_tier`, `payment_status`)
VALUES ('cust-default-001', 'default', 'Super Administrator', 'admin@example.com', 'enterprise', 'paid')
ON DUPLICATE KEY UPDATE `payment_status` = 'paid';

-- Seed Global System Configuration
INSERT INTO `global_settings` (`setting_key`, `setting_value`)
VALUES ('system_config', '{\"allow_self_registration\": true, \"environment\": \"production\", \"version\": \"1.0.0\"}')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

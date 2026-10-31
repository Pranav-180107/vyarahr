-- Migration: Add payment_status to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'trialing' 
  CHECK (payment_status IN ('paid', 'unpaid', 'overdue', 'trialing'));

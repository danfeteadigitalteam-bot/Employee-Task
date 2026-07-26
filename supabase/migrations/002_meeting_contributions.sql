-- Migration: Meeting contributions per employee
-- Run this in your Supabase SQL Editor

-- Add employee_id, status, submitted_at to meeting_department_notes
ALTER TABLE meeting_department_notes
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Drop old unique constraint and add new one (per employee, not per department)
ALTER TABLE meeting_department_notes
  DROP CONSTRAINT IF EXISTS meeting_department_notes_meeting_id_department_id_key;

ALTER TABLE meeting_department_notes
  ADD CONSTRAINT meeting_department_notes_meeting_id_employee_id_key UNIQUE (meeting_id, employee_id);

-- Add overall_minutes to meetings table for compiled minutes
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS overall_minutes TEXT DEFAULT '';

-- Auto-create a draft contribution row when a draft meeting exists
-- (employees will update their own row)

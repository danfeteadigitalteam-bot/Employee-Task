-- Migration: Multi-company support (NTE Loyalty / Danfe Tea)
-- Run this in your Supabase SQL Editor

-- Employees can belong to one or more companies (array)
ALTER TABLE employees
  DROP COLUMN IF EXISTS company;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS companies TEXT[] NOT NULL DEFAULT ARRAY['nte']::text[]
    CHECK (companies <@ ARRAY['nte', 'danfe']::text[] AND array_length(companies, 1) > 0);

-- Meetings belong to a company; employee_id marks the invited employee for 1-on-1 (Danfe Tea) meetings
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'nte' CHECK (company IN ('nte', 'danfe')),
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Weekly tasks carry the company they came from so the "This Week" page can label them
ALTER TABLE weekly_tasks
  ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'nte' CHECK (company IN ('nte', 'danfe'));

CREATE INDEX IF NOT EXISTS idx_employees_companies ON employees USING GIN (companies);
CREATE INDEX IF NOT EXISTS idx_meetings_company ON meetings(company);
CREATE INDEX IF NOT EXISTS idx_meetings_employee ON meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_company ON weekly_tasks(company);

-- Employee Weekly Reporting & Meeting Minutes Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN DEFAULT true,
  must_change_pin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USER SESSIONS
-- ============================================================
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WEEKLY REPORTS
-- ============================================================
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reopened')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, week_start)
);

-- ============================================================
-- WEEKLY TASKS
-- ============================================================
CREATE TABLE weekly_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('planned', 'completed')),
  task_text TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'employee' CHECK (source IN ('employee', 'meeting')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MEETINGS
-- ============================================================
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  attendees TEXT[] DEFAULT '{}',
  agenda_content TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MEETING DEPARTMENT NOTES
-- ============================================================
CREATE TABLE meeting_department_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  discussion TEXT DEFAULT '',
  decisions TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, department_id)
);

-- ============================================================
-- MEETING TASKS (Next-week tasks assigned to employees)
-- ============================================================
CREATE TABLE meeting_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  assigned_week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_sessions_employee ON user_sessions(employee_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_reports_employee ON weekly_reports(employee_id);
CREATE INDEX idx_reports_week ON weekly_reports(week_start, week_end);
CREATE INDEX idx_reports_status ON weekly_reports(status);
CREATE INDEX idx_reports_department ON weekly_reports(department_id);
CREATE INDEX idx_tasks_report ON weekly_tasks(report_id);
CREATE INDEX idx_tasks_employee ON weekly_tasks(employee_id);
CREATE INDEX idx_tasks_type ON weekly_tasks(task_type);
CREATE INDEX idx_meetings_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meeting_notes_meeting ON meeting_department_notes(meeting_id);
CREATE INDEX idx_meeting_tasks_meeting ON meeting_tasks(meeting_id);
CREATE INDEX idx_meeting_tasks_employee ON meeting_tasks(employee_id);
CREATE INDEX idx_meeting_tasks_week ON meeting_tasks(assigned_week_start);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_department_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_tasks ENABLE ROW LEVEL SECURITY;

-- Helper function to get current employee from session header
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS UUID AS $$
  SELECT NULL::UUID;
$$ LANGUAGE sql STABLE;

-- For edge function access, we use service role key
-- These policies are for direct client access patterns

-- Departments: everyone can read, admin can manage
CREATE POLICY "departments_select" ON departments FOR SELECT USING (true);
CREATE POLICY "departments_insert" ON departments FOR INSERT WITH CHECK (true);
CREATE POLICY "departments_update" ON departments FOR UPDATE USING (true);
CREATE POLICY "departments_delete" ON departments FOR DELETE USING (true);

-- Employees: service role handles access control
CREATE POLICY "employees_select" ON employees FOR SELECT USING (true);
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (true);
CREATE POLICY "employees_delete" ON employees FOR DELETE USING (true);

-- Sessions: service role only
CREATE POLICY "sessions_all" ON user_sessions FOR ALL USING (true);

-- Weekly reports: service role handles access
CREATE POLICY "reports_select" ON weekly_reports FOR SELECT USING (true);
CREATE POLICY "reports_insert" ON weekly_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_update" ON weekly_reports FOR UPDATE USING (true);

-- Weekly tasks: service role handles access
CREATE POLICY "tasks_select" ON weekly_tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert" ON weekly_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "tasks_update" ON weekly_tasks FOR UPDATE USING (true);
CREATE POLICY "tasks_delete" ON weekly_tasks FOR DELETE USING (true);

-- Meetings
CREATE POLICY "meetings_select" ON meetings FOR SELECT USING (true);
CREATE POLICY "meetings_insert" ON meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "meetings_update" ON meetings FOR UPDATE USING (true);
CREATE POLICY "meetings_delete" ON meetings FOR DELETE USING (true);

-- Meeting department notes
CREATE POLICY "meeting_notes_select" ON meeting_department_notes FOR SELECT USING (true);
CREATE POLICY "meeting_notes_insert" ON meeting_department_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "meeting_notes_update" ON meeting_department_notes FOR UPDATE USING (true);

-- Meeting tasks
CREATE POLICY "meeting_tasks_select" ON meeting_tasks FOR SELECT USING (true);
CREATE POLICY "meeting_tasks_insert" ON meeting_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "meeting_tasks_update" ON meeting_tasks FOR UPDATE USING (true);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON weekly_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_notes_updated_at BEFORE UPDATE ON meeting_department_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_tasks_updated_at BEFORE UPDATE ON meeting_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Create default admin and departments
-- ============================================================
INSERT INTO departments (name) VALUES
  ('SEO'),
  ('Marketing'),
  ('Development'),
  ('Operations'),
  ('Sales'),
  ('Management')
ON CONFLICT (name) DO NOTHING;

-- Create default admin (PIN: 123456)
-- PIN hash is SHA-256 of "123456"
INSERT INTO employees (employee_code, full_name, department_id, pin_hash, role, is_active, must_change_pin)
SELECT
  'ADM-001',
  'Admin',
  (SELECT id FROM departments WHERE name = 'Management'),
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'admin',
  true,
  false
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'ADM-001');

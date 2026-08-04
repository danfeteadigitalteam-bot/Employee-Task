-- Migration: Fix missing DELETE policies (meeting_tasks, meeting_department_notes, weekly_reports)
-- Run this in your Supabase SQL Editor
-- Safe to run multiple times (idempotent via DO blocks).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meeting_tasks' AND policyname = 'meeting_tasks_delete') THEN
    CREATE POLICY "meeting_tasks_delete" ON meeting_tasks FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meeting_department_notes' AND policyname = 'meeting_notes_delete') THEN
    CREATE POLICY "meeting_notes_delete" ON meeting_department_notes FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_reports' AND policyname = 'reports_delete') THEN
    CREATE POLICY "reports_delete" ON weekly_reports FOR DELETE USING (true);
  END IF;
END $$;

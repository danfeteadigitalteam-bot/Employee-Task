-- Migration: Week management - allow deleting draft weekly reports
-- Run this in your Supabase SQL Editor

-- Weekly reports: allow deleting reports (used to remove old draft weeks)
CREATE POLICY "reports_delete" ON weekly_reports FOR DELETE USING (true);

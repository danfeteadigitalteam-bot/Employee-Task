-- Migration: Meeting tasks - employee checklist + admin tasks
-- Run this in your Supabase SQL Editor

-- Add source and status to meeting_tasks
ALTER TABLE meeting_tasks
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' CHECK (source IN ('employee', 'admin')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted'));

# Employee Workspace

Internal weekly task reporting and meeting minutes web application.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Edge Functions)
- React Router + React Query

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

### 3. Database Setup

Go to your Supabase Dashboard → SQL Editor and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, RLS policies, triggers, and seeds default departments + admin user.

### 4. Deploy Edge Functions

```bash
npx supabase login
npx supabase link --project-ref dmlkenqghukqejavlfmb
npx supabase functions deploy login
npx supabase functions deploy change-pin
npx supabase functions deploy reset-pin
npx supabase functions deploy validate-session
```

### 5. Run Development Server

```bash
npm run dev
```

## Default Admin Account

- **Employee ID:** ADM-001
- **PIN:** 123456

## Routes

### Public
- `/login` - Employee login

### Employee
- `/employee/dashboard` - Dashboard
- `/employee/report` - Weekly report (tasks, completed work, notes)
- `/employee/reports` - Previous reports
- `/employee/meetings` - Published meeting minutes
- `/employee/profile` - Profile + change PIN

### Admin
- `/admin/dashboard` - Summary dashboard
- `/admin/employees` - Manage employees
- `/admin/departments` - Manage departments
- `/admin/reports` - View reports by department/week
- `/admin/agenda` - Generate meeting agenda from reports
- `/admin/meetings` - Meeting minutes list
- `/admin/meetings/:id` - Edit meeting (discussions, decisions, tasks)

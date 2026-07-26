export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  department_id: string;
  pin_hash: string;
  role: "admin" | "employee";
  is_active: boolean;
  must_change_pin: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface UserSession {
  id: string;
  employee_id: string;
  session_token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  employee_id: string;
  department_id: string;
  week_start: string;
  week_end: string;
  notes: string;
  status: "draft" | "submitted" | "reopened";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  tasks?: WeeklyTask[];
}

export interface WeeklyTask {
  id: string;
  report_id: string;
  employee_id: string;
  task_type: "planned" | "completed";
  task_text: string;
  is_checked: boolean;
  source: "employee" | "meeting";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  week_start: string;
  week_end: string;
  attendees: string[];
  agenda_content: string;
  status: "draft" | "published";
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  department_notes?: MeetingDepartmentNote[];
  tasks?: MeetingTask[];
}

export interface MeetingDepartmentNote {
  id: string;
  meeting_id: string;
  department_id: string;
  discussion: string;
  decisions: string;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface MeetingTask {
  id: string;
  meeting_id: string;
  employee_id: string;
  department_id: string;
  task_text: string;
  is_checked: boolean;
  assigned_week_start: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  department?: Department;
}

export interface LoginRequest {
  employee_code: string;
  pin: string;
}

export interface LoginResponse {
  success: boolean;
  session_token?: string;
  employee?: Employee;
  error?: string;
}

export interface ChangePinRequest {
  employee_id: string;
  current_pin: string;
  new_pin: string;
}

export interface ResetPinRequest {
  admin_id: string;
  employee_id: string;
  new_pin: string;
}

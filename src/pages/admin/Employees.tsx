//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\Employees.tsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { EDGE_FUNCTION_BASE } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, RotateCcw, UserPlus, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { NewWeekButton } from "@/components/shared/NewWeekButton";
import { toast } from "sonner";
import type { Employee, Department } from "@/types/database";

interface EmployeeWithDept extends Employee {
  departments?: { name: string };
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminEmployees() {
  const { employee: admin } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithDept[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithDept | null>(null);
  const [resetPinEmployee, setResetPinEmployee] = useState<EmployeeWithDept | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeWithDept | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "employee">("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPinValue, setResetPinValue] = useState("");

  const fetchData = useCallback(async () => {
    const [deptsRes, empsRes] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("employees").select("*, departments(name)").order("employee_code"),
    ]);
    if (deptsRes.data) setDepartments(deptsRes.data as Department[]);
    if (empsRes.data) setEmployees(empsRes.data as EmployeeWithDept[]);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateEmployeeCode = () => {
    const maxNum = employees.reduce((max, emp) => {
      const match = emp.employee_code.match(/EMP-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `EMP-${String(maxNum + 1).padStart(3, "0")}`;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formDept || !formPin) return;

    setIsSubmitting(true);

    // Hash the PIN via edge function
    try {
      // We'll insert with a placeholder hash, then reset via edge function
      const { data, error } = await supabase
        .from("employees")
        .insert({
          full_name: formName.trim(),
          employee_code: formCode.toUpperCase(),
          department_id: formDept,
          pin_hash: "pending",
          role: formRole,
          is_active: true,
          must_change_pin: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Employee ID already exists");
        } else {
          toast.error("Failed to create employee");
        }
        setIsSubmitting(false);
        return;
      }

      // Reset PIN to set proper hash
      if (data && admin) {
        await fetch(`${EDGE_FUNCTION_BASE}/reset-pin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            admin_id: admin.id,
            employee_id: data.id,
            new_pin: formPin,
          }),
        });
      }

      toast.success("Employee created successfully");
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch {
      toast.error("Failed to create employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !formName.trim() || !formDept) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from("employees")
      .update({
        full_name: formName.trim(),
        department_id: formDept,
        role: formRole,
      })
      .eq("id", editingEmployee.id);

    setIsSubmitting(false);

    if (!error) {
      toast.success("Employee updated");
      setEditingEmployee(null);
      resetForm();
      fetchData();
    } else {
      toast.error("Failed to update employee");
    }
  };

  const handleResetPin = async () => {
    if (!resetPinEmployee || !admin || !resetPinValue || !/^\d{6}$/.test(resetPinValue)) return;

    const response = await fetch(`${EDGE_FUNCTION_BASE}/reset-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        admin_id: admin.id,
        employee_id: resetPinEmployee.id,
        new_pin: resetPinValue,
      }),
    });

    const data = await response.json();

    if (data.success) {
      toast.success("PIN reset successfully. Employee must change PIN on next login.");
      setResetPinEmployee(null);
      setResetPinValue("");
    } else {
      toast.error(data.error || "Failed to reset PIN");
    }
  };

  const handleToggleActive = async (emp: EmployeeWithDept) => {
    const { error } = await supabase
      .from("employees")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);

    if (!error) {
      toast.success(`Employee ${emp.is_active ? "deactivated" : "activated"}`);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("employees").delete().eq("id", deleteTarget.id);
    if (!error) {
      toast.success("Employee deleted");
      setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    } else {
      if (error.code === "23503") {
        toast.error("Cannot delete: employee has associated records (e.g. created meetings)");
      } else {
        toast.error("Failed to delete employee");
      }
    }
    setDeleteTarget(null);
  };

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormDept("");
    setFormPin("");
    setFormRole("employee");
  };

  const openEditDialog = (emp: EmployeeWithDept) => {
    setFormName(emp.full_name);
    setFormCode(emp.employee_code);
    setFormDept(emp.department_id);
    setFormRole(emp.role);
    setEditingEmployee(emp);
  };

  return (
    <PageLayout
      title="Employees"
      description="Manage employee accounts"
      actions={
        <Button onClick={() => { resetForm(); setFormCode(generateEmployeeCode()); setShowAddDialog(true); }} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex p-3 bg-accent rounded-full mb-3">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="text-sm font-medium">No employees found</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first employee to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Employee</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Department</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                            {initialsOf(emp.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(emp as any).departments?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs capitalize">{emp.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={emp.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(emp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setResetPinEmployee(emp); setResetPinValue(""); }}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant={emp.is_active ? "ghost" : "outline"}
                            className="h-8 text-xs"
                            onClick={() => handleToggleActive(emp)}
                          >
                            {emp.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <NewWeekButton employee={emp} compact onStarted={() => fetchData()} />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(emp)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. John Smith" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="EMP-001" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formDept} onValueChange={(v) => setFormDept(v ?? "")} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole((v ?? "employee") as "admin" | "employee")} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial PIN (6 digits)</Label>
              <Input
                type="password"
                value={formPin}
                onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                disabled={isSubmitting}
                className="tracking-widest"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowAddDialog(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Employee"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={formCode} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formDept} onValueChange={(v) => setFormDept(v ?? "")} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole((v ?? "employee") as "admin" | "employee")} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingEmployee(null)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset PIN Dialog */}
      <Dialog open={!!resetPinEmployee} onOpenChange={() => setResetPinEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN for {resetPinEmployee?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The employee will be required to change their PIN on next login.
            </p>
            <div className="space-y-2">
              <Label>New PIN (6 digits)</Label>
              <Input
                type="password"
                value={resetPinValue}
                onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                className="tracking-widest"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setResetPinEmployee(null)}>Cancel</Button>
              <Button onClick={handleResetPin} disabled={!resetPinValue || !/^\d{6}$/.test(resetPinValue)}>
                Reset PIN
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deleteTarget?.full_name}" (${deleteTarget?.employee_code})? This will also remove all their weekly reports, tasks, and meeting data. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageLayout>
  );
}
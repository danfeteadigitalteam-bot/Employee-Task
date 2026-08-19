//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\Departments.tsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import type { Department } from "@/types/database";

export default function AdminDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    if (data) setDepartments(data as Department[]);
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("departments").insert({ name: formName.trim() });
    setIsSubmitting(false);

    if (!error) {
      toast.success("Department created");
      setShowAddDialog(false);
      setFormName("");
      fetchDepartments();
    } else {
      if (error.code === "23505") {
        toast.error("Department name already exists");
      } else {
        toast.error("Failed to create department");
      }
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !formName.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("departments")
      .update({ name: formName.trim() })
      .eq("id", editingDept.id);
    setIsSubmitting(false);

    if (!error) {
      toast.success("Department updated");
      setEditingDept(null);
      setFormName("");
      fetchDepartments();
    } else {
      toast.error("Failed to update department");
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;

    const { error } = await supabase.from("departments").delete().eq("id", deletingDept.id);

    if (!error) {
      toast.success("Department deleted");
      setDeletingDept(null);
      fetchDepartments();
    } else {
      toast.error("Cannot delete department with assigned employees");
      setDeletingDept(null);
    }
  };

  return (
    <PageLayout
      title="Departments"
      description="Manage company departments"
      actions={
        <Button onClick={() => { setFormName(""); setShowAddDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      }
    >
      {departments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-3 bg-accent rounded-full mb-3">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-sm font-medium">No departments yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first department to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept.id} className="card-interactive">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-accent rounded-xl shrink-0">
                      <Building2 className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dept.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created {new Date(dept.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => { setFormName(dept.name); setEditingDept(dept); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeletingDept(dept)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. SEO"
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowAddDialog(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDept} onOpenChange={() => setEditingDept(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingDept(null)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingDept}
        onOpenChange={() => setDeletingDept(null)}
        title="Delete Department"
        description={`Are you sure you want to delete "${deletingDept?.name}"? This cannot be undone. Employees in this department will need to be reassigned first.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </PageLayout>
  );
}
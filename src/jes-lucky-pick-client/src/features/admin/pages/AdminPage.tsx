import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/features/admin/api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserFormDialog } from "@/features/admin/components/UserFormDialog";
import { DeleteUserDialog } from "@/features/admin/components/DeleteUserDialog";
import type { UserDto } from "@/types/api";
import { Pencil, Trash2, Plus } from "lucide-react";

export function AdminPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => fetchUsers(page, pageSize),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteOpen(false);
    },
  });

  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0;
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function openCreate() {
    setSelectedUser(null);
    setFormOpen(true);
  }

  function openEdit(user: UserDto) {
    setSelectedUser(user);
    setFormOpen(true);
  }

  function openDelete(user: UserDto) {
    setSelectedUser(user);
    setDeleteOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage users and system settings</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Users{" "}
            {data && (
              <span className="text-sm font-normal text-muted-foreground">
                ({data.totalCount} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "Admin" ? "default" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View system activity and audit trail.
            </p>
            <Badge className="mt-2" variant="outline">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Seeding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trigger manual data import for draw history.
            </p>
            <Badge className="mt-2" variant="outline">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Other Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
              <p>6/49 — Coming Soon</p>
              <p>6/55 — Coming Soon</p>
              <p>6/58 — Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={selectedUser}
        isLoading={isMutating}
        onSubmit={(formData) => {
          if (selectedUser) {
            updateMutation.mutate({
              id: selectedUser.id,
              data: {
                email: formData.email,
                password: formData.password,
                role: formData.role,
                isActive: formData.isActive,
              },
            });
          } else {
            createMutation.mutate({
              username: formData.username!,
              email: formData.email,
              password: formData.password!,
              role: formData.role,
            });
          }
        }}
      />

      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={selectedUser}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (selectedUser) deleteMutation.mutate(selectedUser.id);
        }}
      />
    </div>
  );
}

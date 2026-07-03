import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface User {
  id?: number;
  email: string;
  password?: string;
  role: "admin" | "vendedor" | "user";
}

export default function UsersPage() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPasswordConfirm, setNewUserPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const { data: authUser, isLoading } = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: usersData, refetch: refetchUsers } = trpc.users.list.useQuery(undefined, {
    enabled: Boolean(token) && Boolean(authUser) && authUser?.role === "admin",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const createUserMutation = trpc.users.create.useMutation();
  const deleteUserMutation = trpc.users.delete.useMutation();

  useEffect(() => {
    if (!token) {
      setLocation("/");
      return;
    }

    if (isLoading) return;

    if (!authUser) {
      setLocation("/");
      return;
    }

    if (authUser.role !== "admin") {
      toast.error("No tienes permiso para acceder a esta sección");
      setLocation("/dashboard");
      return;
    }

    if (usersData) {
      setUsers(
        usersData.map((user: any) => ({
          id: user.id,
          email: user.email || "",
          role: user.role === "admin" ? "admin" : "vendedor",
        }))
      );
    }
  }, [authUser, isLoading, setLocation, token, usersData]);

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserPasswordConfirm) {
      toast.error("Completa todos los campos");
      return;
    }

    if (newUserPassword !== newUserPasswordConfirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (users.some(u => u.email === newUserEmail)) {
      toast.error("Este correo ya está registrado");
      return;
    }

    try {
      const result = await createUserMutation.mutateAsync({
        email: newUserEmail,
        password: newUserPassword,
        name: newUserEmail,
      });

      if (result.user) {
        setUsers((prev) => [
          ...prev,
          {
            id: result.user.id,
            email: result.user.email || newUserEmail,
            role: "vendedor",
          },
        ]);
      }

      await refetchUsers();
      toast.success(`Vendedor creado: ${newUserEmail}`);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserPasswordConfirm("");
      setShowCreateDialog(false);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear el vendedor");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.email === "admin@gmail.com") {
      toast.error("No puedes eliminar la cuenta de administrador");
      return;
    }

    if (!user.id) {
      toast.error("No se pudo identificar el usuario");
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ id: user.id });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      await refetchUsers();
      toast.success(`Vendedor eliminado: ${user.email}`);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar el vendedor");
    }
  };

  const vendedores = users.filter((u) => u.role === "vendedor");

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-red-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="text-red-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Create Button */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vendedores</h2>
            <p className="text-gray-600">Total: {vendedores.length} vendedor{vendedores.length !== 1 ? "es" : ""}</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 touch-friendly"
          >
            <Plus className="w-4 h-4" />
            Crear Vendedor
          </Button>
        </div>

        {/* Users List */}
        {vendedores.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No hay vendedores creados aún</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Crear primer vendedor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {vendedores.map((user) => (
              <Card key={user.email} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.email}</p>
                    <p className="text-sm text-gray-500">Rol: Vendedor</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(user)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Admin User Card */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrador</h3>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <p className="font-medium text-gray-900">admin@gmail.com</p>
              <p className="text-sm text-gray-600 mt-1">Rol: Administrador (No se puede eliminar)</p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Vendedor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Correo Electrónico</label>
              <Input
                type="email"
                placeholder="vendedor@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="touch-friendly"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="touch-friendly pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Contraseña</label>
              <div className="relative">
                <Input
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={newUserPasswordConfirm}
                  onChange={(e) => setNewUserPasswordConfirm(e.target.value)}
                  className="touch-friendly pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900">
                <strong>Nota:</strong> Los vendedores solo podrán acceder a la sección de ventas.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 touch-friendly"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white touch-friendly"
                onClick={handleCreateUser}
                disabled={false}
              >
                Crear Vendedor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useContext();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Server sets httpOnly session cookie; no localStorage token needed
      toast.success(`¡Bienvenido ${data.user.role === "admin" ? "Administrador" : "Vendedor"}!`);
      try {
        // Refetch authenticated user from server to ensure session is active
        await utils.auth.me.refetch();
      } catch {}
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      toast.error(error.message || "Credenciales inválidas");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa email y contraseña");
      return;
    }

    loginMutation.mutate({ email: email.trim(), password: password.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo con orbes de color - Actualizado a #d81b17 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #d81b17, #b81512)",
            top: "-120px",
            right: "-100px",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #a0120f, #d81b17)",
            bottom: "-80px",
            left: "-80px",
          }}
        />
        {/* Grid sutil - Actualizado a #d81b17 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(216,27,23,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(216,27,23,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Card de login - Actualizado a #d81b17 */}
      <div
        className="w-full max-w-md relative animate-fade-in-scale"
        style={{
          background: "rgba(22, 18, 15, 0.85)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          border: "1px solid rgba(216,27,23,0.18)",
          borderRadius: "1.25rem",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(216,27,23,0.08), 0 0 60px rgba(216,27,23,0.06)",
          padding: "2.5rem",
        }}
      >
        {/* Logo - Con fondo blanco suave */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 animate-float overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 0 32px rgba(216,27,23,0.3), 0 8px 24px rgba(0,0,0,0.2)",
              border: "2px solid rgba(255,255,255,0.2)",
            }}
          >
            <img 
              src="https://i.postimg.cc/bN1y6MHK/logo-Photoroom.png" 
              alt="Logo Asados" 
              className="w-full h-full object-contain p-2"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
            />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e63946, #d81b17, #b81512)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Asados Ventas
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 260)" }}>
            Sistema de gestión de inventario y ventas
          </p>
        </div>

        {/* Divider - Actualizado a #d81b17 */}
        <div className="divider-brand mb-8" />

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5 animate-fade-in delay-100">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: "oklch(0.70 0.01 260)" }}
            >
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loginMutation.isPending}
              autoComplete="email"
              className="input-premium h-11 text-sm px-4"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.10)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div className="space-y-1.5 animate-fade-in delay-200">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: "oklch(0.70 0.01 260)" }}
            >
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                autoComplete="current-password"
                className="input-premium h-11 text-sm px-4 pr-10"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.10)",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "oklch(0.50 0.01 260)" }}
                disabled={loginMutation.isPending}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 animate-fade-in delay-300">
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loginMutation.isPending || !email || !password}
              className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                loginMutation.isPending || !email || !password
                  ? {
                      background: "rgba(216,27,23,0.3)",
                      cursor: "not-allowed",
                    }
                  : {
                      background: "linear-gradient(135deg, #d81b17, #b81512, #a0120f)",
                      boxShadow: "0 0 24px rgba(216,27,23,0.4), 0 4px 16px rgba(0,0,0,0.3)",
                      transition: "all 0.3s ease",
                    }
              }
              onMouseEnter={(e) => {
                if (!loginMutation.isPending && email && password) {
                  e.currentTarget.style.boxShadow = "0 0 32px rgba(216,27,23,0.6), 0 4px 20px rgba(0,0,0,0.4)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loginMutation.isPending && email && password) {
                  e.currentTarget.style.boxShadow = "0 0 24px rgba(216,27,23,0.4), 0 4px 16px rgba(0,0,0,0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <LogIn className="w-4 h-4" />
              {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p
          className="text-center text-xs mt-6 animate-fade-in delay-400"
          style={{ color: "oklch(0.40 0.01 260)" }}
        >
          Asados Ventas e Inventario © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
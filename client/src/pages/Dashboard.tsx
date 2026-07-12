import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  BarChart3,
  LogOut,
  Lock,
  Users,
  DollarSign,
  History,
  TrendingUp,
  Flame,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    enabled: true,
  });
  const logoutMutation = trpc.auth.logout.useMutation();

  const [summary, setSummary] = useState({
    totalSales: 0,
    totalCash: 0,
    totalTransfer: 0,
    totalCredit: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const loadSummary = async () => {
      try {
        // Use cookie-based session; no local token header
        const token = "";
        const now = new Date().toISOString();
        const payload = {
          "0": {
            json: { date: now },
            meta: { values: { date: ["Date"] } },
          },
        };

        const balanceResponse = await fetch(
          `/api/trpc/reports.dailyBalance?batch=1&input=${encodeURIComponent(JSON.stringify(payload))}`,
          { credentials: "include" }
        );
        const balancePayload = await balanceResponse.json();
        const balanceData = Array.isArray(balancePayload)
          ? balancePayload[0]?.result?.data?.json
          : balancePayload;

        const salesResponse = await fetch(
          `/api/trpc/sales.byDate?batch=1&input=${encodeURIComponent(JSON.stringify(payload))}`,
          { credentials: "include" }
        );
        const salesPayload = await salesResponse.json();
        const salesData = Array.isArray(salesPayload)
          ? salesPayload[0]?.result?.data?.json
          : salesPayload;

        const expensesResponse = await fetch(
          `/api/trpc/expenses.byDate?batch=1&input=${encodeURIComponent(JSON.stringify(payload))}`,
          { credentials: "include" }
        );
        const expensesPayload = await expensesResponse.json();
        const expensesData = Array.isArray(expensesPayload)
          ? expensesPayload[0]?.result?.data?.json
          : expensesPayload;

        if (balanceData && (balanceData.totalSales || balanceData.cashSales || balanceData.transferSales || balanceData.creditSales)) {
          const expensesTotal = Array.isArray(expensesData) ? (expensesData.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100) : 0;
          const totalSalesCalc = (balanceData.totalSales || 0) / 100;
          setSummary({
            totalSales: totalSalesCalc,
            totalCash: (balanceData.cashSales || 0) / 100,
            totalTransfer: (balanceData.transferSales || 0) / 100,
            totalCredit: (balanceData.creditSales || 0) / 100,
            totalExpenses: expensesTotal,
            netProfit: totalSalesCalc - expensesTotal,
            transactionCount: balanceData.transactionCount || salesData?.length || 0,
          });
          return;
        }

        if (Array.isArray(salesData)) {
          let totalAmount = 0;
          let cashAmount = 0;
          let transferAmount = 0;
          let creditAmount = 0;
          salesData.forEach((sale: any) => {
            const amount = sale.totalPrice / 100;
            totalAmount += amount;
            if (sale.paymentMethod === "efectivo") cashAmount += amount;
            else if (sale.paymentMethod === "transferencia") transferAmount += amount;
            else if (sale.paymentMethod === "fiado") creditAmount += amount;
          });

          const expensesTotal = Array.isArray(expensesData) ? (expensesData.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100) : 0;
          setSummary({
            totalSales: totalAmount,
            totalCash: cashAmount,
            totalTransfer: transferAmount,
            totalCredit: creditAmount,
            totalExpenses: expensesTotal,
            netProfit: totalAmount - expensesTotal,
            transactionCount: salesData.length,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard summary", error);
      }
    };

    loadSummary();
  }, [user]);

  useEffect(() => {
    if (!isLoading && user === null) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  const { totalSales, totalCash, totalTransfer, totalCredit, totalExpenses, netProfit, transactionCount } = summary;

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Sesión cerrada");
      setLocation("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  const handleRestrictedAccess = () => {
    toast.error("Los vendedores no tienen acceso a esta sección");
  };

  const allNavigationCards = [
    {
      title: "Ventas",
      description: "Registra nuevas ventas de productos",
      icon: ShoppingCart,
      gradient: "from-orange-500 to-red-600",
      glowColor: "rgba(249,115,22,0.4)",
      href: "/sales",
      restricted: false,
    },
    {
      title: "Inventario",
      description: "Gestiona el stock de productos",
      icon: Package,
      gradient: "from-amber-500 to-orange-600",
      glowColor: "rgba(245,158,11,0.4)",
      href: "/inventory",
      restricted: true,
    },
    {
      title: "Reportes",
      description: "Análisis de ventas y balances",
      icon: BarChart3,
      gradient: "from-red-500 to-rose-600",
      glowColor: "rgba(239,68,68,0.4)",
      href: "/reports",
      restricted: true,
    },
    {
      title: "Usuarios",
      description: "Gestiona vendedores y permisos",
      icon: Users,
      gradient: "from-violet-500 to-purple-600",
      glowColor: "rgba(139,92,246,0.4)",
      href: "/users",
      restricted: true,
    },
    {
      title: "Cierre de Caja",
      description: "Registra cierres diarios con PDF",
      icon: DollarSign,
      gradient: "from-emerald-500 to-green-600",
      glowColor: "rgba(16,185,129,0.4)",
      href: "/cash-closing",
      restricted: true,
    },
    {
      title: "Historial",
      description: "Ver transacciones y cierres",
      icon: History,
      gradient: "from-sky-500 to-blue-600",
      glowColor: "rgba(14,165,233,0.4)",
      href: "/transaction-history",
      restricted: true,
    },
    {
      title: "Gastos",
      description: "Registrar y revisar gastos",
      icon: Flame,
      gradient: "from-rose-500 to-pink-600",
      glowColor: "rgba(239,68,68,0.4)",
      href: "/expenses",
      restricted: true,
    },
  ];

  const navigationCards =
    user?.role === "admin"
      ? allNavigationCards
      : allNavigationCards.filter((card) => !card.restricted);

  if (isLoading) return null;

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const roleLabel = isAdmin ? "Administrador" : "Vendedor";

  const statCards = [
    {
      label: "Ventas Hoy",
      value: `$${totalSales.toLocaleString()}`,
      sub: `${transactionCount} transacciones`,
      color: "#f97316",
      glowColor: "rgba(249,115,22,0.25)",
      icon: TrendingUp,
    },
    {
      label: "Efectivo",
      value: `$${totalCash.toLocaleString()}`,
      sub: "Recaudado",
      color: "#22c55e",
      glowColor: "rgba(34,197,94,0.20)",
      icon: DollarSign,
    },
    {
      label: "Transferencia",
      value: `$${totalTransfer.toLocaleString()}`,
      sub: "Registrado",
      color: "#38bdf8",
      glowColor: "rgba(56,189,248,0.20)",
      icon: BarChart3,
    },
    {
      label: "Gastos",
      value: `$${(totalExpenses || 0).toLocaleString()}`,
      sub: "Registrados",
      color: "#ef4444",
      glowColor: "rgba(239,68,68,0.20)",
      icon: Flame,
    },
    {
      label: "Neto",
      value: `$${(netProfit || 0).toLocaleString()}`,
      sub: "Ventas - Gastos",
      color: "#10b981",
      glowColor: "rgba(16,185,129,0.2)",
      icon: ChevronRight,
    },
    {
      label: "Fiado",
      value: `$${totalCredit.toLocaleString()}`,
      sub: "Por cobrar",
      color: "#fb923c",
      glowColor: "rgba(251,146,60,0.20)",
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Orbes de fondo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, #f9a916, transparent)",
            top: "-200px",
            right: "-150px",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-8 blur-3xl"
          style={{
            background: "radial-gradient(circle, #ea580c, transparent)",
            bottom: "-100px",
            left: "-100px",
          }}
        />
      </div>

      {/* Header */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo con fondo blanco suave */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(4px)",
                boxShadow: "0 0 16px rgba(249,115,22,0.3), 0 2px 8px rgba(0,0,0,0.1)",
                border: "1.5px solid rgba(255,255,255,0.2)",
              }}
            >
              <img 
                src="https://i.postimg.cc/bN1y6MHK/logo-Photoroom.png" 
                alt="Logo Asados" 
                className="w-full h-full object-contain p-1"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none" style={{ color: "var(--foreground)" }}>
                Asados Don Montoya              </h1>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.01 260)" }}>
                Sistema de gestión
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {user.email}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {!isAdmin && <Lock className="w-3 h-3" style={{ color: "#fb923c" }} />}
                <p
                  className="text-xs font-medium"
                  style={{ color: isAdmin ? "oklch(0.55 0.01 260)" : "#fb923c" }}
                >
                  {roleLabel}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: "rgba(249,115,22,0.12)",
                border: "1px solid rgba(249,115,22,0.20)",
                color: "#f97316",
              }}
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-10 relative">
        {/* Bienvenida */}
        <div className="mb-10 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#f97316" }}>
            Panel Principal
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            ¡Hola, {user?.email?.split("@")[0] || "Usuario"}! 👋
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>
            {isAdmin
              ? "Selecciona una sección para gestionar tu negocio"
              : "Accede a ventas para registrar transacciones"}
          </p>
        </div>

        {/* Stats — solo admin */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="stat-card animate-fade-in"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    borderColor: `${stat.color}22`,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                      {stat.label}
                    </p>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${stat.glowColor}`,
                        border: `1px solid ${stat.color}30`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.48 0.01 260)" }}>
                    {stat.sub}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        {isAdmin && <div className="divider-brand mb-8" />}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {navigationCards.map((card, i) => {
            const Icon = card.icon;
            const isRestricted = card.restricted && !isAdmin;
            return (
              <div
                key={card.href}
                id={`nav-card-${card.title.toLowerCase()}`}
                className={`nav-card animate-fade-in ${isRestricted ? "opacity-40 cursor-not-allowed" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => {
                  if (isRestricted) {
                    handleRestrictedAccess();
                  } else {
                    setLocation(card.href);
                  }
                }}
              >
                {/* Top banner */}
                <div
                  className={`h-28 bg-gradient-to-br ${card.gradient} relative overflow-hidden flex items-center justify-center`}
                >
                  {/* Icono decorativo grande */}
                  <Icon
                    className="absolute -right-4 -top-4 text-white opacity-10"
                    style={{ width: "100px", height: "100px" }}
                  />
                  {/* Icono central */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "1.5px solid rgba(255,255,255,0.25)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Lock overlay */}
                  {isRestricted && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-white mx-auto mb-1" />
                        <p className="text-white text-xs font-semibold">Solo Admin</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-base" style={{ color: "var(--foreground)" }}>
                      {card.title}
                    </h3>
                    {!isRestricted && (
                      <ChevronRight
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        style={{ color: "oklch(0.45 0.01 260)" }}
                      />
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "oklch(0.52 0.01 260)" }}>
                    {card.description}
                  </p>

                  <button
                    id={`btn-access-${card.title.toLowerCase()}`}
                    className="mt-4 w-full h-9 rounded-lg text-sm font-semibold transition-all"
                    style={
                      isRestricted
                        ? {
                            background: "rgba(255,255,255,0.05)",
                            color: "oklch(0.45 0.01 260)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            cursor: "not-allowed",
                          }
                        : {
                            background: `linear-gradient(135deg, ${card.gradient.includes("orange") ? "#f97316" : card.gradient.includes("amber") ? "#f59e0b" : card.gradient.includes("red") ? "#ef4444" : card.gradient.includes("violet") ? "#8b5cf6" : card.gradient.includes("emerald") ? "#10b981" : card.gradient.includes("sky") ? "#0ea5e9" : "#64748b"}, ${card.gradient.includes("orange") ? "#ea580c" : card.gradient.includes("amber") ? "#d97706" : card.gradient.includes("red") ? "#dc2626" : card.gradient.includes("violet") ? "#7c3aed" : card.gradient.includes("emerald") ? "#059669" : card.gradient.includes("sky") ? "#0284c7" : "#475569"})`,
                            color: "white",
                            boxShadow: `0 0 16px ${card.glowColor}`,
                          }
                    }
                    disabled={isRestricted}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRestricted) handleRestrictedAccess();
                      else setLocation(card.href);
                    }}
                  >
                    {isRestricted ? "No disponible" : "Acceder"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Aviso vendedor */}
        {!isAdmin && (
          <div
            className="mt-8 animate-fade-in delay-300 rounded-xl p-4"
            style={{
              background: "rgba(251,146,60,0.07)",
              border: "1px solid rgba(251,146,60,0.18)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4" style={{ color: "#fb923c" }} />
              <p className="font-semibold text-sm" style={{ color: "#fb923c" }}>
                Acceso Restringido
              </p>
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
}
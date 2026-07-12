import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);

const formatDateTime = (value?: Date | string) => {
  if (!value) return "";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RobustAlert } from "@/components/RobustAlert";
import { ArrowLeft, History, Calendar, Wallet, TrendingUp, Clock } from "lucide-react";

export default function TransactionHistory() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Queries
  const { data: user } = trpc.auth.me.useQuery();
  const { data: salesData } = trpc.sales.byDate.useQuery({
    date: parseDateInput(selectedDate),
  });

  const { data: expensesData } = trpc.expenses.byDate.useQuery({
    date: parseDateInput(selectedDate),
  });

  const { data: recentClosings } = trpc.cashClosings.recent.useQuery({
    limit: 20,
  });

  const handleShowAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const totalSales = salesData?.reduce((sum: number, sale: { totalPrice: number }) => sum + sale.totalPrice, 0) || 0;
  const cashSales = salesData?.filter((s: { paymentMethod: string }) => s.paymentMethod === "efectivo").reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0) || 0;
  const transferSales = salesData?.filter((s: { paymentMethod: string }) => s.paymentMethod === "transferencia").reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0) || 0;
  const creditSales = salesData?.filter((s: { paymentMethod: string }) => s.paymentMethod === "fiado").reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0) || 0;
  const totalExpenses = expensesData?.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
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

      {/* Header con logo grande */}
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="hover:bg-white/10"
              style={{ color: "#f97316" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  boxShadow: "0 0 12px rgba(249,115,22,0.3)",
                }}
              >
                <History className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Historial
              </h1>
            </div>
          </div>

          {/* Logo grande */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 0 24px rgba(249,115,22,0.35), 0 4px 12px rgba(0,0,0,0.15)",
              border: "2px solid rgba(255,255,255,0.25)",
            }}
          >
            <img 
              src="https://i.postimg.cc/bN1y6MHK/logo-Photoroom.png" 
              alt="Logo Asados" 
              className="w-full h-full object-contain p-1.5"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative">
        {/* Título */}
        <div className="mb-8 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#f97316" }}>
            Seguimiento
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            Historial de Transacciones
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>
            Consulta ventas por fecha y revisa cierres recientes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Date Filter and Sales */}
          <div className="lg:col-span-2 space-y-4">
            {/* Date Filter */}
            <div className="glass-card p-5 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5" style={{ color: "#f97316" }} />
                <label className="text-sm font-medium" style={{ color: "oklch(0.65 0.01 260)" }}>
                  Seleccionar Fecha
                </label>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-premium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.09)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Sales Summary */}
            <div className="glass-card p-6 animate-fade-in delay-100">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5" style={{ color: "#f97316" }} />
                <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  Ventas del {new Date(selectedDate).toLocaleDateString("es-AR")}
                </h2>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg p-3 text-center" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)" }}>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Total</p>
                  <p className="text-lg font-bold" style={{ color: "#f97316" }}>{formatCurrency(totalSales)}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Efectivo</p>
                  <p className="text-lg font-bold" style={{ color: "#22c55e" }}>{formatCurrency(cashSales)}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)" }}>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Transferencia</p>
                  <p className="text-lg font-bold" style={{ color: "#38bdf8" }}>{formatCurrency(transferSales)}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.12)" }}>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Fiados</p>
                  <p className="text-lg font-bold" style={{ color: "#fb923c" }}>{formatCurrency(creditSales)}</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Gastos</p>
                  <p className="text-lg font-bold" style={{ color: "#ef4444" }}>{formatCurrency(totalExpenses)}</p>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                    Transacciones ({salesData?.length || 0})
                  </h3>
                  <span className="text-xs" style={{ color: "oklch(0.45 0.01 260)" }}>
                    {salesData?.length || 0} registros
                  </span>
                </div>

                {salesData && salesData.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {salesData.map((sale: { id: number; productId: number; productName?: string | null; quantity: number; unitPrice: number; totalPrice: number; paymentMethod: string; date?: Date | string }) => (
                      <div
                        key={sale.id}
                        className="flex justify-between items-center p-3 rounded-lg transition-all hover:scale-[1.01]"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                            {sale.productName || `Producto #${sale.productId}`}
                          </p>
                          <p className="text-xs" style={{ color: "oklch(0.55 0.01 260)" }}>
                            {sale.quantity} x {formatCurrency(sale.unitPrice)}
                          </p>
                          <p className="text-xs" style={{ color: "oklch(0.40 0.01 260)" }}>
                            {formatDateTime(sale.date)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm" style={{ color: "#f97316" }}>
                            {formatCurrency(sale.totalPrice)}
                          </p>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: sale.paymentMethod === "efectivo" 
                                ? "rgba(34,197,94,0.15)" 
                                : sale.paymentMethod === "transferencia" 
                                ? "rgba(56,189,248,0.15)" 
                                : "rgba(251,146,60,0.15)",
                              color: sale.paymentMethod === "efectivo" 
                                ? "#22c55e" 
                                : sale.paymentMethod === "transferencia" 
                                ? "#38bdf8" 
                                : "#fb923c",
                            }}
                          >
                            {sale.paymentMethod === "efectivo" ? "Efectivo" : sale.paymentMethod === "transferencia" ? "Transferencia" : "Fiado"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" style={{ color: "oklch(0.45 0.01 260)" }}>
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-25" />
                    <p>No hay transacciones para esta fecha</p>
                  </div>
                )}

                {/* Expenses list */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Gastos ({expensesData?.length || 0})</h4>
                  {expensesData && expensesData.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {expensesData.map((e: any) => (
                        <div key={e.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div>
                            <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{e.description || 'Gasto'}</p>
                            <p className="text-xs" style={{ color: "oklch(0.55 0.01 260)" }}>{formatDateTime(e.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm" style={{ color: "#ef4444" }}>{formatCurrency(e.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "oklch(0.45 0.01 260)" }}>No hay gastos registrados</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Closings */}
          <div>
            <div className="glass-card p-6 animate-fade-in delay-200 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" style={{ color: "#a78bfa" }} />
                <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  Cierres Recientes
                </h2>
              </div>

              {recentClosings && recentClosings.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {recentClosings.map((closing: { id: number; difference: number; date: Date | string; totalSales: number; expectedCash: number; actualCash: number }) => {
                    const diff = closing.difference / 100;
                    const isPositive = diff >= 0;
                    return (
                      <div
                        key={closing.id}
                        className="p-4 rounded-lg transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          background: isPositive 
                            ? "rgba(34,197,94,0.06)" 
                            : "rgba(239,68,68,0.06)",
                          border: `1px solid ${isPositive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                        }}
                        onClick={() =>
                          handleShowAlert(
                            "Detalles del Cierre",
                            `Fecha: ${new Date(closing.date).toLocaleDateString("es-AR")}\n\n` +
                            `Total Ventas: $${(closing.totalSales / 100).toFixed(2)}\n` +
                            `Efectivo Esperado: $${(closing.expectedCash / 100).toFixed(2)}\n` +
                            `Efectivo Contado: $${(closing.actualCash / 100).toFixed(2)}\n\n` +
                            `Diferencia: $${diff.toFixed(2)} ${isPositive ? "(Sobrante ✅)" : "(Faltante ❌)"}`
                          )
                        }
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                              {new Date(closing.date).toLocaleDateString("es-AR")}
                            </p>
                            <p className="text-xs" style={{ color: "oklch(0.55 0.01 260)" }}>
                              Total: ${(closing.totalSales / 100).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-sm font-bold"
                              style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
                            >
                              ${diff.toFixed(2)}
                            </p>
                            <p className="text-xs" style={{ color: "oklch(0.40 0.01 260)" }}>
                              {isPositive ? "Sobrante" : "Faltante"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: "oklch(0.45 0.01 260)" }}>
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  <p>No hay cierres registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <RobustAlert
        open={showAlert}
        onOpenChange={setShowAlert}
        title={alertTitle}
        message={alertMessage}
      />
    </div>
  );
}
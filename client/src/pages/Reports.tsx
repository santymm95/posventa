import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";

interface Sale {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: "efectivo" | "transferencia" | "fiado";
  timestamp: Date;
}

interface DailySummary {
  date: string;
  totalSales: number;
  efectivoSales: number;
  transferenciaSales: number;
  fiadoSales: number;
  transactionCount: number;
  expenses?: number;
  net?: number;
}

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

export default function Reports() {
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // tRPC queries
  const { data: user } = trpc.auth.me.useQuery();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const todayString = getDateString(today);
  const sevenDaysAgoString = getDateString(sevenDaysAgo);
  
  const { data: salesData, refetch: refetchSales } = trpc.sales.byDateRange.useQuery({ 
    startDate: parseDateInput(startDate || sevenDaysAgoString),
    endDate: parseDateInput(endDate || todayString),
  });

  const { data: expensesRange, refetch: refetchExpenses } = trpc.expenses.byRange.useQuery({
    startDate: parseDateInput(startDate || sevenDaysAgoString),
    endDate: parseDateInput(endDate || todayString),
  });

  useEffect(() => {
    // Solo redirigir si user está definido pero no es admin
    if (user && user.role !== "admin") {
      toast.error("No tienes permiso para acceder a esta sección");
      setLocation("/dashboard");
      return;
    }

    // Parse sales and expenses regardless of presence of one or the other
    const parsedSales = (salesData && Array.isArray(salesData)) ? salesData.map((sale: any) => ({
      id: sale.id || 0,
      productId: sale.productId,
      productName: sale.productName || "Producto",
      quantity: sale.quantity,
      unitPrice: sale.unitPrice / 100, // Convertir de centavos a pesos
      totalPrice: sale.totalPrice / 100, // Convertir de centavos a pesos
      paymentMethod: sale.paymentMethod,
      timestamp: new Date(sale.date || sale.createdAt),
    })) : [];

    const parsedExpenses = (expensesRange && Array.isArray(expensesRange)) ? expensesRange.map((e: any) => ({
      id: e.id,
      date: new Date(e.date),
      amount: e.amount / 100,
      description: e.description,
    })) : [];

    // Debug logs to inspect expenses payload
    console.log('[Reports] expensesRange:', expensesRange);
    console.log('[Reports] parsedExpenses:', parsedExpenses);

    setSales(parsedSales);
    setFilteredSales(parsedSales);
    // Generar resumen diario combinando ventas y gastos
    generateDailySummary(parsedSales, parsedExpenses);

    // Total gastos del periodo
    const expensesTotal = parsedExpenses.reduce((s: number, x: any) => s + (x.amount || 0), 0);
    setTotalExpenses(expensesTotal);

    // Establecer fechas por defecto (últimos 7 días)
    if (!startDate) {
      setStartDate(sevenDaysAgoString);
    }
    if (!endDate) {
      setEndDate(todayString);
    }
  }, [user, salesData, expensesRange, setLocation]);

  const generateDailySummary = (salesList: Sale[], expensesList: any[] = []) => {
    const summary: Record<string, DailySummary & { expenses?: number }> = {};

    salesList.forEach((sale) => {
      const date = new Date(sale.timestamp).toISOString().split("T")[0];
      if (!summary[date]) {
        summary[date] = {
          date,
          totalSales: 0,
          efectivoSales: 0,
          transferenciaSales: 0,
          fiadoSales: 0,
          transactionCount: 0,
          expenses: 0,
        } as any;
      }

      summary[date].totalSales += sale.totalPrice;
      summary[date].transactionCount += 1;

      if (sale.paymentMethod === "efectivo") {
        summary[date].efectivoSales += sale.totalPrice;
      } else if (sale.paymentMethod === "transferencia") {
        summary[date].transferenciaSales += sale.totalPrice;
      } else if (sale.paymentMethod === "fiado") {
        summary[date].fiadoSales += sale.totalPrice;
      }
    });

    expensesList.forEach((exp) => {
      const date = new Date(exp.date).toISOString().split("T")[0];
      if (!summary[date]) {
        summary[date] = {
          date,
          totalSales: 0,
          efectivoSales: 0,
          transferenciaSales: 0,
          fiadoSales: 0,
          transactionCount: 0,
          expenses: 0,
        } as any;
      }
      summary[date].expenses = (summary[date].expenses || 0) + (exp.amount || 0);
    });

    const sorted = Object.values(summary).map((s: any) => ({
      date: s.date,
      totalSales: s.totalSales,
      efectivoSales: s.efectivoSales,
      transferenciaSales: s.transferenciaSales,
      fiadoSales: s.fiadoSales,
      transactionCount: s.transactionCount,
      expenses: s.expenses || 0,
      net: (s.totalSales || 0) - (s.expenses || 0),
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setDailySummary(sorted as DailySummary[]);
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      return;
    }
    refetchSales();
    refetchExpenses();
  };

  // Calcular totales
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalEfectivo = filteredSales.reduce((sum, sale) => sum + (sale.paymentMethod === "efectivo" ? sale.totalPrice : 0), 0);
  const totalTransferencia = filteredSales.reduce((sum, sale) => sum + (sale.paymentMethod === "transferencia" ? sale.totalPrice : 0), 0);
  const totalFiado = filteredSales.reduce((sum, sale) => sum + (sale.paymentMethod === "fiado" ? sale.totalPrice : 0), 0);
  const totalTransactions = filteredSales.length;
  const netTotal = totalSales - totalExpenses;

  // Datos para gráficos
  const paymentMethodData = [
    { name: "Efectivo", value: totalEfectivo },
    { name: "Transferencia", value: totalTransferencia },
    { name: "Fiado", value: totalFiado },
  ];

  const productSalesData = filteredSales.reduce((acc: Record<string, number>, sale) => {
    acc[sale.productName] = (acc[sale.productName] || 0) + sale.totalPrice;
    return acc;
  }, {});

  const productChartData = Object.entries(productSalesData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#f97316", "#fb923c", "#22c55e", "#38bdf8", "#a78bfa"];

  // Shared dark card style
  const darkCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.85rem",
  };

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
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Reportes
              </h1>
            </div>
          </div>

          {/* Logo grande - Igual que en Ventas e Inventario */}
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#f97316" }}>Análisis</p>
          <h2 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>Reportes</h2>
        </div>

        {/* Date Filter */}
        <div className="mb-8 p-5 rounded-xl animate-fade-in" style={darkCard}>
          <p className="text-sm font-semibold mb-4" style={{ color: "oklch(0.65 0.01 260)" }}>Filtrar por Fechas</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium block mb-1.5" style={{ color: "oklch(0.55 0.01 260)" }}>Desde</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="input-premium w-full h-10 px-3 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", color: "var(--foreground)", borderRadius: "0.65rem" }} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium block mb-1.5" style={{ color: "oklch(0.55 0.01 260)" }}>Hasta</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="input-premium w-full h-10 px-3 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", color: "var(--foreground)", borderRadius: "0.65rem" }} />
            </div>
            <div className="flex items-end">
              <button onClick={handleFilter} className="btn-shimmer h-10 px-6 rounded-xl text-sm font-semibold text-white w-full sm:w-auto">
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Ventas", value: `$${totalSales.toLocaleString()}`, color: "#f97316", glow: "rgba(249,115,22,0.2)" },
            { label: "Efectivo", value: `$${totalEfectivo.toLocaleString()}`, color: "#22c55e", glow: "rgba(34,197,94,0.18)" },
            { label: "Transferencia", value: `$${totalTransferencia.toLocaleString()}`, color: "#38bdf8", glow: "rgba(56,189,248,0.18)" },
            { label: "Fiado", value: `$${totalFiado.toLocaleString()}`, color: "#fb923c", glow: "rgba(251,146,60,0.18)" },
            { label: "Gastos", value: `$${totalExpenses.toLocaleString()}`, color: "#ef4444", glow: "rgba(239,68,68,0.18)" },
            { label: "Neto", value: `$${netTotal.toLocaleString()}`, color: "#10b981", glow: "rgba(16,185,129,0.18)" },
            { label: "Transacciones", value: String(totalTransactions), color: "#a78bfa", glow: "rgba(167,139,250,0.18)" },
          ].map((stat, i) => (
            <div key={stat.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i*70}ms`, borderColor: `${stat.color}22` }}>
              <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.55 0.01 260)" }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Payment Method Pie Chart */}
          <div style={{ ...darkCard, padding: "1.25rem" }}>
            <p className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>Ventas por Método de Pago</p>
              {paymentMethodData.some((item) => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ background: "rgba(16,12,10,0.95)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "0.5rem", color: "#f5f0e8" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center" style={{ color: "oklch(0.50 0.01 260)" }}>No hay datos disponibles</div>
              )}
          </div>

          {/* Products Bar Chart */}
          <div style={{ ...darkCard, padding: "1.25rem" }}>
            <p className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>Ingresos por Producto</p>
              {productChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ background: "rgba(16,12,10,0.95)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "0.5rem", color: "#f5f0e8" }} />
                    <Bar dataKey="value" fill="#f97316" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center" style={{ color: "oklch(0.50 0.01 260)" }}>No hay datos disponibles</div>
              )}
          </div>
        </div>

        {/* Daily Trend */}
        <div className="mb-8" style={{ ...darkCard, padding: "1.25rem" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: "#f97316" }} />
            <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Tendencia Diaria de Ventas</p>
          </div>
          {dailySummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ background: "rgba(16,12,10,0.95)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "0.5rem", color: "#f5f0e8" }} />
                <Legend wrapperStyle={{ color: "oklch(0.65 0.01 260)", fontSize: "0.75rem" }} />
                <Line type="monotone" dataKey="totalSales" stroke="#f97316" strokeWidth={2.5} name="Total Ventas" dot={{ fill: "#f97316", r: 3 }} />
                <Line type="monotone" dataKey="efectivoSales" stroke="#22c55e" strokeWidth={2} name="Efectivo" dot={{ fill: "#22c55e", r: 3 }} />
                <Line type="monotone" dataKey="transferenciaSales" stroke="#38bdf8" strokeWidth={2} name="Transferencia" dot={{ fill: "#38bdf8", r: 3 }} />
                <Line type="monotone" dataKey="fiadoSales" stroke="#fb923c" strokeWidth={2} name="Fiado" dot={{ fill: "#fb923c", r: 3 }} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Gastos" dot={{ fill: "#ef4444", r: 3 }} />
                <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} name="Neto" dot={{ fill: "#10b981", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center" style={{ color: "oklch(0.50 0.01 260)" }}>No hay datos disponibles</div>
          )}
        </div>

        {/* Detailed Transactions Table */}
        <div style={{ ...darkCard, padding: "1.25rem" }}>
          <p className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}>Detalle de Transacciones</p>
          {filteredSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Fecha/Hora","Producto","Cantidad","Precio Unit.","Total","Método"].map(h => (
                      <th key={h} className="py-2.5 px-3 text-left text-xs font-semibold" style={{ color: "oklch(0.50 0.01 260)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 text-xs" style={{ color: "oklch(0.55 0.01 260)" }}>{new Date(sale.timestamp).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-medium text-sm" style={{ color: "var(--foreground)" }}>{sale.productName || `Producto #${sale.productId}`}</td>
                      <td className="py-2.5 px-3 text-center text-sm" style={{ color: "var(--foreground)" }}>{sale.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-sm" style={{ color: "oklch(0.65 0.01 260)" }}>${sale.unitPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-sm" style={{ color: "#f97316" }}>${sale.totalPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: sale.paymentMethod==="efectivo" ? "rgba(34,197,94,0.15)" : sale.paymentMethod==="transferencia" ? "rgba(56,189,248,0.15)" : "rgba(251,146,60,0.15)",
                          color: sale.paymentMethod==="efectivo" ? "#22c55e" : sale.paymentMethod==="transferencia" ? "#38bdf8" : "#fb923c",
                          border: `1px solid ${sale.paymentMethod==="efectivo" ? "rgba(34,197,94,0.3)" : sale.paymentMethod==="transferencia" ? "rgba(56,189,248,0.3)" : "rgba(251,146,60,0.3)"}`
                        }}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center" style={{ color: "oklch(0.50 0.01 260)" }}>No hay transacciones en el período seleccionado</div>
          )}
        </div>
      </main>
    </div>
  );
}
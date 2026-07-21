import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatPriceInputDisplay, parsePriceInput } from "@/lib/priceFormatter";

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
import { Textarea } from "@/components/ui/textarea";
import { RobustAlert } from "@/components/RobustAlert";
import { ArrowLeft, DollarSign, FileText, Printer } from "lucide-react";
import jsPDF from "jspdf";

export default function CashClosing() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
  const [expectedCash, setExpectedCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  const { data: user } = trpc.auth.me.useQuery();
  const { data: dailyBalance } = trpc.reports.dailyBalance.useQuery({
    date: parseDateInput(selectedDate),
  });

  const { data: existingClosing } = trpc.cashClosings.byDate.useQuery({
    date: parseDateInput(selectedDate),
  });

  const { data: expensesForDate } = trpc.expenses.byDate.useQuery({
    date: parseDateInput(selectedDate),
  });

  const createClosingMutation = trpc.cashClosings.create.useMutation({
    onSuccess: () => {
      utils.cashClosings.byDate.invalidate({ date: parseDateInput(selectedDate) });
    }
  });

  const handleCreateClosing = async () => {
    const exp = parsePriceInput(expectedCash);
    const act = parsePriceInput(actualCash);

    if (exp <= 0 || act < 0) {
      setAlertTitle("Error");
      setAlertMessage("Por favor, ingresa valores numéricos válidos");
      setShowAlert(true);
      return;
    }

    const closingPayload = {
      date: new Date(selectedDate),
      expectedCash: Math.round(exp * 100),
      actualCash: Math.round(act * 100),
      notes: notes || undefined,
    };

    try {
      await createClosingMutation.mutateAsync(closingPayload);

      setAlertTitle("Éxito");
      setAlertMessage("Cierre de caja registrado correctamente");
      setShowAlert(true);

      handleGeneratePDF({
        ...closingPayload,
        createdAt: new Date().toISOString(),
      });

      setExpectedCash("");
      setActualCash("");
      setNotes("");
    } catch (error) {
      setAlertTitle("Error");
      setAlertMessage("Error al registrar el cierre de caja");
      setShowAlert(true);
    }
  };

  type ClosingData = {
    expectedCash: number;
    actualCash: number;
    notes?: string;
    createdAt?: string;
  };

  const handleGeneratePDF = (closingData?: ClosingData) => {
    const closing = closingData || existingClosing;
    if (!dailyBalance || !closing) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.text("CIERRE DE CAJA", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    doc.setFontSize(12);
    const dateParts = selectedDate.split("-");
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    doc.text(`Fecha: ${formattedDate}`, 20, yPosition);
    yPosition += 15;

    doc.setFontSize(14);
    doc.text("RESUMEN DE VENTAS", 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(11);
    const sales = [
      `Total Ventas: $${(dailyBalance.totalSales / 100).toLocaleString("es-CO")}`,
      `Efectivo: $${(dailyBalance.cashSales / 100).toLocaleString("es-CO")}`,
      `Transferencia: $${(dailyBalance.transferSales / 100).toLocaleString("es-CO")}`
    ];
    sales.forEach(line => { doc.text(line, 20, yPosition); yPosition += 7; });

    // Gastos del día
    const expensesTotal = (Array.isArray(expensesForDate) ? (expensesForDate.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100) : 0);
    yPosition += 5;
    doc.setFontSize(14);
    doc.text("GASTOS", 20, yPosition);
    yPosition += 8;
    doc.setFontSize(11);
    doc.text(`Total Gastos: $${expensesTotal.toLocaleString("es-CO")}`, 20, yPosition);
    yPosition += 7;

    const netAfterExpenses = (dailyBalance.totalSales / 100) - expensesTotal;
    doc.setFontSize(12);
    doc.text(`Neto (Ventas - Gastos): $${netAfterExpenses.toLocaleString("es-CO")}`, 20, yPosition);
    yPosition += 10;

    yPosition += 5;
    doc.setFontSize(14);
    doc.text("DETALLES DEL CIERRE", 20, yPosition);
    yPosition += 8;
    doc.setFontSize(11);
    doc.text(`Efectivo Esperado: $${(closing.expectedCash / 100).toLocaleString("es-CO")}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Efectivo Contado: $${(closing.actualCash / 100).toLocaleString("es-CO")}`, 20, yPosition);
    yPosition += 7;
    const diff = (closing.actualCash - closing.expectedCash) / 100;
    doc.text(`Diferencia: $${diff.toLocaleString("es-CO")}`, 20, yPosition);
    yPosition += 7;
    if (closing.notes) {
      const splitNotes = doc.splitTextToSize(`Notas: ${closing.notes}`, 170);
      doc.text(splitNotes, 20, yPosition);
    }

    doc.save(`cierre-caja-${selectedDate}.pdf`);
  };

  const diffValue = parsePriceInput(actualCash) - parsePriceInput(expectedCash);
  const difference = isNaN(diffValue) ? 0 : diffValue;

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
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Cierre de Caja
              </h1>
            </div>
          </div>

          {/* Logo grande - Igual que en las demás páginas */}
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
            Gestión Financiera
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            Cierre de Caja
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>
            Registra el cierre diario de caja y genera reportes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de Cierre */}
          <div className="glass-card p-6 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
              Registrar Cierre
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Fecha
                </label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="input-premium w-full h-10 px-3 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.09)",
                    color: "var(--foreground)",
                    borderRadius: "0.65rem",
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Efectivo Esperado ($)
                </label>
                <Input
                  type="text"
                  value={expectedCash}
                  onChange={(e) => setExpectedCash(formatPriceInputDisplay(e.target.value))}
                  placeholder="0"
                  className="input-premium"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.09)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Efectivo Contado ($)
                </label>
                <Input
                  type="text"
                  value={actualCash}
                  onChange={(e) => setActualCash(formatPriceInputDisplay(e.target.value))}
                  placeholder="0"
                  className="input-premium"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.09)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Notas (Opcional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Comentarios adicionales..."
                  className="input-premium"
                  rows={3}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.09)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {expectedCash && actualCash && (
                <div
                  className="rounded-lg p-3 text-center animate-fade-in-scale"
                  style={{
                    background: diffValue >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${diffValue >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                    Diferencia
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: diffValue >= 0 ? "#22c55e" : "#ef4444" }}
                  >
                    ${diffValue.toLocaleString()}
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateClosing}
                disabled={!!existingClosing || !expectedCash || !actualCash}
                className="w-full h-12 rounded-xl font-semibold gap-2"
                style={{
                  background: existingClosing 
                    ? "rgba(100,116,139,0.2)"
                    : "linear-gradient(135deg, #f97316, #ea580c)",
                  color: existingClosing ? "oklch(0.45 0.01 260)" : "white",
                  boxShadow: existingClosing ? "none" : "0 0 20px rgba(249,115,22,0.3)",
                  cursor: existingClosing ? "not-allowed" : "pointer",
                }}
              >
                <DollarSign className="w-4 h-4" />
                {existingClosing ? "Cierre ya registrado" : "Registrar Cierre"}
              </Button>
            </div>
          </div>

          {/* Información y Estado */}
          <div className="space-y-6">
            {/* Resumen del día */}
            <div className="glass-card p-6 animate-fade-in delay-100">
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                Resumen del Día
              </h3>
              
              {dailyBalance ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Total Ventas</span>
                    <span className="text-lg font-bold" style={{ color: "#f97316" }}>
                      ${(dailyBalance.totalSales / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Efectivo</span>
                    <span className="text-lg font-bold" style={{ color: "#22c55e" }}>
                      ${(dailyBalance.cashSales / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Transferencia</span>
                    <span className="text-lg font-bold" style={{ color: "#38bdf8" }}>
                      ${(dailyBalance.transferSales / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Transacciones</span>
                    <span className="text-lg font-bold" style={{ color: "#a78bfa" }}>
                      {dailyBalance.transactionCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Gastos</span>
                    <span className="text-lg font-bold" style={{ color: "#ef4444" }}>
                      ${((Array.isArray(expensesForDate) ? expensesForDate.reduce((s: number, e: any) => s + (e.amount || 0), 0) : 0) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Neto (Ventas - Gastos)</span>
                    <span className="text-lg font-bold" style={{ color: "#10b981" }}>
                      ${(dailyBalance.totalSales / 100 - (Array.isArray(expensesForDate) ? expensesForDate.reduce((s: number, e: any) => s + (e.amount || 0), 0) : 0) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: "oklch(0.45 0.01 260)" }}>
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  <p>No hay ventas registradas para esta fecha</p>
                </div>
              )}
            </div>

            {/* Estado del cierre */}
            <div className="glass-card p-6 animate-fade-in delay-200">
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                Estado del Cierre
              </h3>
              
              {existingClosing ? (
                <div className="space-y-3">
                  <div
                    className="rounded-lg p-4 text-center"
                    style={{
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: "#22c55e" }}>
                      ✓ Cierre Completado
                    </p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                      Registrado el {new Date(existingClosing.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Efectivo Esperado</span>
                    <span className="font-bold" style={{ color: "var(--foreground)" }}>
                      ${(existingClosing.expectedCash / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Efectivo Contado</span>
                    <span className="font-bold" style={{ color: "var(--foreground)" }}>
                      ${(existingClosing.actualCash / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Diferencia</span>
                    <span
                      className="font-bold"
                      style={{
                        color: (existingClosing.actualCash - existingClosing.expectedCash) / 100 >= 0 
                          ? "#22c55e" 
                          : "#ef4444"
                      }}
                    >
                      ${((existingClosing.actualCash - existingClosing.expectedCash) / 100).toLocaleString()}
                    </span>
                  </div>
                  
                  {existingClosing.notes && (
                    <div className="mt-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Notas:</p>
                      <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>{existingClosing.notes}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleGeneratePDF()}
                    className="w-full h-11 rounded-xl font-semibold gap-2 mt-2"
                    style={{
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      color: "white",
                      boxShadow: "0 0 20px rgba(34,197,94,0.3)",
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    Generar PDF
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: "oklch(0.45 0.01 260)" }}>
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  <p>No hay cierre registrado para esta fecha</p>
                  <p className="text-xs mt-1">Completa el formulario para registrar el cierre</p>
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
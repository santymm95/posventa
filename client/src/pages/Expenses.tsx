import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatPriceInputDisplay, parsePriceInput } from "@/lib/priceFormatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Flame, Plus } from "lucide-react";
import { toast } from "sonner";

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

export default function Expenses() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [date, setDate] = useState(getDateString(new Date()));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.byDate.invalidate({ date: parseDateInput(date) });
      utils.reports.dailyBalance.invalidate({ date: parseDateInput(date) });
    },
  });

  const handleSubmit = async () => {
    const numeric = parsePriceInput(amount);
    if (numeric <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        date: parseDateInput(date),
        description: description || undefined,
        amount: numeric,
      });
      toast.success("Gasto registrado");
      setDescription("");
      setAmount("");
    } catch (err) {
      console.error(err);
      toast.error("Error al crear gasto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="header-premium sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="hover:bg-white/10"
              style={{ color: "#ef4444" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                  boxShadow: "0 0 12px rgba(239,68,68,0.3)",
                }}
              >
                <Flame className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Registrar Gasto
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="glass-card p-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Nuevo Gasto
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-premium w-full h-10 px-3 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", color: "var(--foreground)", borderRadius: "0.65rem" }}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del gasto" rows={3} />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Monto ($)</label>
              <Input
                type="text"
                value={amount}
                onChange={(e) => setAmount(formatPriceInputDisplay(e.target.value))}
                placeholder="0"
                className="input-premium"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", color: "var(--foreground)" }}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", color: "white" }}>
                <Plus className="w-4 h-4 mr-2" />
                {submitting ? "Guardando..." : "Registrar Gasto"}
              </Button>
              <Button variant="ghost" onClick={() => { setDescription(""); setAmount(""); }}>
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

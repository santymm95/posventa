import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import CashClosing from "./pages/CashClosing";
import TransactionHistory from "./pages/TransactionHistory";
import { supabase } from "./supabaseClient";

function SupabaseConnectionProbe() {
  const [status, setStatus] = useState("Revisando conexión a Supabase...");

  useEffect(() => {
    async function probar() {
      if (!supabase) {
        const message = "Supabase no está configurado. Agrega la URL y la clave anon en .env.";
        setStatus(message);
        console.warn(message);
        return;
      }

      const { data, error } = await supabase.from("products").select("*").limit(1);

      if (error) {
        const message = `Error conectando a Supabase: ${error.message}`;
        setStatus(message);
        console.error(message, error);
      } else {
        const message = `¡Conexión exitosa! Se recibieron ${data?.length ?? 0} productos.`;
        setStatus(message);
        console.log(message, data);
      }
    }

    void probar();
  }, []);

  return (
    <div style={{ position: "fixed", top: 8, right: 8, zIndex: 9999, background: status.includes("Error") ? "#fee2e2" : status.includes("exitosa") ? "#dcfce7" : "#fef3c7", color: "#111827", padding: "8px 12px", borderRadius: 8, fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", maxWidth: 320 }}>
      {status}
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/" || location === "/login") {
    return <Login />;
  }

  return (
    <Switch>
      <Route path={"/"} component={Login} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/sales"} component={Sales} />
      <Route path={"/inventory"} component={Inventory} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/users"} component={Users} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/cash-closing"} component={CashClosing} />
      <Route path={"/transaction-history"} component={TransactionHistory} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Agregar sonido de clic global
    const playClickSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.log('Audio context not available');
      }
    };

    // Agregar listener a todos los botones y elementos clickeables
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A' || target.closest('[role="button"]')) {
        playClickSound();
      }
    });
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <SupabaseConnectionProbe />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

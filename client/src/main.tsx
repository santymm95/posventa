import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Cargar colores guardados al iniciar la app
const loadAppConfig = () => {
  const saved = localStorage.getItem("appConfig");
  if (saved) {
    try {
      const config = JSON.parse(saved);
      document.documentElement.style.setProperty("--primary-color", config.primaryColor);
      document.documentElement.style.setProperty("--secondary-color", config.secondaryColor);
      document.documentElement.style.setProperty("--accent-color", config.accentColor);
      if (config.appTitle) {
        document.title = config.appTitle;
      }
    } catch (error) {
      console.error("Error loading app config:", error);
    }
  }
};

loadAppConfig();

// Escuchar cambios en la configuración
window.addEventListener('appConfigUpdated', () => {
  loadAppConfig();
});

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const headers = new Headers(init?.headers);
        // Use cookies for auth (httpOnly session cookie); do not read localStorage
        return globalThis.fetch(input, {
          method: init?.method,
          body: init?.body,
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

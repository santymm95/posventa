import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleAlert } from "@/components/SimpleAlert";
import { ArrowLeft, Upload, Palette, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AppConfig {
  appTitle: string;
  logoImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const DEFAULT_CONFIG: AppConfig = {
  appTitle: "Asados Ventas",
  logoImage: "",
  primaryColor: "#DC2626", // red-600
  secondaryColor: "#EF4444", // red-500
  accentColor: "#991B1B", // red-900
};

export default function Settings() {
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // tRPC queries
  const { data: user } = trpc.auth.me.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  // tRPC mutations
  const updateSettingsMutation = trpc.settings.update.useMutation();

  useEffect(() => {
    // Solo redirigir si user está definido pero no es admin
    if (user && user.role !== "admin") {
      toast.error("No tienes permiso para acceder a esta sección");
      setLocation("/dashboard");
      return;
    }

    // Cargar configuración desde BD
    if (settings) {
      try {
        setConfig({
          appTitle: settings.appTitle || DEFAULT_CONFIG.appTitle,
          logoImage: settings.appLogo || DEFAULT_CONFIG.logoImage,
          primaryColor: settings.primaryColor || DEFAULT_CONFIG.primaryColor,
          secondaryColor: settings.secondaryColor || DEFAULT_CONFIG.secondaryColor,
          accentColor: DEFAULT_CONFIG.accentColor, // No está en BD, usar default
        });
      } catch (error) {
        console.error("Error loading config:", error);
        setConfig(DEFAULT_CONFIG);
      }
    }
  }, [user, settings, setLocation]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setConfig({ ...config, logoImage: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTitleChange = (value: string) => {
    setConfig({ ...config, appTitle: value });
  };

  const handleColorChange = (colorKey: keyof Omit<AppConfig, "appTitle" | "logoImage">, value: string) => {
    setConfig({ ...config, [colorKey]: value });
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      // Guardar en BD
      await updateSettingsMutation.mutateAsync({
        appTitle: config.appTitle,
        appLogo: config.logoImage,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        theme: "light",
      });

      // Aplicar colores al documento
      document.documentElement.style.setProperty("--primary-color", config.primaryColor);
      document.documentElement.style.setProperty("--secondary-color", config.secondaryColor);
      document.documentElement.style.setProperty("--accent-color", config.accentColor);
      
      // Actualizar título de la página
      document.title = config.appTitle;
      
      // Disparar evento para que otros componentes se actualicen
      window.dispatchEvent(new Event('appConfigUpdated'));
      
      setAlertMessage("Configuración guardada correctamente");
      setShowAlert(true);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = async () => {
    setLoading(true);
    try {
      // Restablecer en BD
      await updateSettingsMutation.mutateAsync({
        appTitle: DEFAULT_CONFIG.appTitle,
        appLogo: DEFAULT_CONFIG.logoImage,
        primaryColor: DEFAULT_CONFIG.primaryColor,
        secondaryColor: DEFAULT_CONFIG.secondaryColor,
        theme: "light",
      });

      setConfig(DEFAULT_CONFIG);
      document.documentElement.style.removeProperty("--primary-color");
      document.documentElement.style.removeProperty("--secondary-color");
      document.documentElement.style.removeProperty("--accent-color");
      document.title = DEFAULT_CONFIG.appTitle;
      toast.success("Configuración restablecida");
    } catch (error) {
      console.error("Error resetting config:", error);
      toast.error("Error al restablecer la configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            </div>
          </div>
          <Button
            onClick={handleSaveConfig}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Logo Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Logo de la Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.logoImage && (
              <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={config.logoImage} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-blue-600" />
                <span className="text-sm text-gray-600">Seleccionar logo</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </CardContent>
        </Card>

        {/* Title Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nombre de la Aplicación</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={config.appTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Nombre de la aplicación"
              className="text-lg"
            />
          </CardContent>
        </Card>

        {/* Colors Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colores de la Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Color Primario</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                  className="w-20 h-12 rounded-lg cursor-pointer border border-gray-300"
                />
                <Input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                  placeholder="#DC2626"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Se usa en botones principales y headers</p>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Color Secundario</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => handleColorChange("secondaryColor", e.target.value)}
                  className="w-20 h-12 rounded-lg cursor-pointer border border-gray-300"
                />
                <Input
                  type="text"
                  value={config.secondaryColor}
                  onChange={(e) => handleColorChange("secondaryColor", e.target.value)}
                  placeholder="#EF4444"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Se usa en elementos secundarios</p>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Color de Acento</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => handleColorChange("accentColor", e.target.value)}
                  className="w-20 h-12 rounded-lg cursor-pointer border border-gray-300"
                />
                <Input
                  type="text"
                  value={config.accentColor}
                  onChange={(e) => handleColorChange("accentColor", e.target.value)}
                  placeholder="#991B1B"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">Se usa en detalles y énfasis</p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.logoImage && (
                <div className="flex justify-center">
                  <img src={config.logoImage} alt="Logo preview" className="h-16 object-contain" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-center text-gray-900">{config.appTitle}</h2>
              <div className="flex gap-2 justify-center">
                <button
                  style={{ backgroundColor: config.primaryColor }}
                  className="px-6 py-2 text-white rounded-lg font-medium"
                >
                  Botón Primario
                </button>
                <button
                  style={{ backgroundColor: config.secondaryColor }}
                  className="px-6 py-2 text-white rounded-lg font-medium"
                >
                  Botón Secundario
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveConfig}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 font-bold"
          >
            {loading ? "Guardando..." : "Guardar Configuración"}
          </Button>
          <Button
            onClick={handleResetConfig}
            variant="outline"
            className="flex-1 h-12 font-bold"
          >
            Restablecer
          </Button>
        </div>
      </main>

      {/* Success Alert */}
      <SimpleAlert
        open={showAlert}
        onOpenChange={setShowAlert}
        title="Éxito"
        message={alertMessage}
      />
    </div>
  );
}

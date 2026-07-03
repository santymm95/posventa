import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RobustAlert } from "@/components/RobustAlert";
import { ArrowLeft, Package, Plus, X, Image as ImageIcon, Search, ShoppingBag, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QuantityKeypad } from "@/components/QuantityKeypad";
import { trpc } from "@/lib/trpc";
import { formatPriceDisplay, parsePriceInput } from "@/lib/priceFormatter";
import { buildVariantInventoryPayloads } from "@/lib/productInventory";
import { fetchSupabaseInventory, fetchSupabaseProducts } from "@/lib/supabaseData";

interface InventoryItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  previousDayQuantity: number;
  image: string;
  price: number;
  date: Date;
}

export default function Inventory() {
  const [, setLocation] = useLocation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<{ itemId: number; field: 'quantity' | 'previousDayQuantity' } | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductImage, setNewProductImage] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("");
  const [showVariantsInput, setShowVariantsInput] = useState(false);
  const [variants, setVariants] = useState<Array<{name: string; price: string}>>([]);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductImage, setEditProductImage] = useState("");
  const [editProductImageFile, setEditProductImageFile] = useState<string>("");
  const [alertKey, setAlertKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // tRPC queries
  const { data: user, isLoading: authLoading, isError: authError } = trpc.auth.me.useQuery();
  const { data: todayInventory, isLoading: inventoryLoading, isError: inventoryError, refetch } = trpc.inventory.today.useQuery();
  const { data: allProducts, isLoading: productsLoading, isError: productsError } = trpc.products.list.useQuery();

  // tRPC mutations y utils
  const utils = trpc.useUtils();
  const upsertInventoryMutation = trpc.inventory.upsert.useMutation();
  const createProductMutation = trpc.products.create.useMutation();
  const updateProductMutation = trpc.products.update.useMutation();
  const deleteProductMutation = trpc.products.delete.useMutation();
  const createVariantMutation = trpc.products.createVariant.useMutation();

  useEffect(() => {
    const loadInventory = async () => {
      if (authLoading || inventoryLoading || productsLoading) {
        return;
      }

      if (authError || inventoryError || productsError) {
        setInventory([]);
        setLoading(false);
        return;
      }

      if (!user) {
        setLocation("/login");
        setLoading(false);
        return;
      }

      if (user.role !== "admin") {
        toast.error("No tienes permiso para acceder a esta sección");
        setLocation("/dashboard");
        setLoading(false);
        return;
      }

      const supabaseProducts = await fetchSupabaseProducts();
      const supabaseInventory = await fetchSupabaseInventory();

      const visibleProducts = (allProducts ?? []).filter((product: any) => product.active !== 0);
      const dbInventoryRows = todayInventory ?? [];
      const hasDbData = visibleProducts.length > 0 || dbInventoryRows.length > 0;
      const hasSupabaseData =
        Array.isArray(supabaseProducts) &&
        Array.isArray(supabaseInventory) &&
        (supabaseProducts.length > 0 || supabaseInventory.length > 0);

      if (hasDbData) {
        const mappedInventory = dbInventoryRows
          .map((inv: any) => {
            const product = visibleProducts.find((p: any) => p.id === inv.productId);
            if (!product) return null;
            return {
              ...inv,
              name: product.name || "Producto",
              image: product.image || "",
              price: (product.price || 0) / 100,
            };
          })
          .filter(Boolean) as InventoryItem[];

        setInventory(mappedInventory);
        setLoading(false);
        return;
      }

      if (hasSupabaseData) {
        const visibleProductsFromSupabase = supabaseProducts.filter((product: any) => product.active !== 0);
        const mappedInventory = supabaseInventory
          .map((inv: any) => {
            const product = visibleProductsFromSupabase.find((p: any) => p.id === inv.productId);
            if (!product) return null;
            return {
              ...inv,
              name: product.name || "Producto",
              image: product.image || "",
              price: (product.price || 0) / 100,
            };
          })
          .filter(Boolean) as InventoryItem[];

        setInventory(mappedInventory);
        setLoading(false);
        return;
      }

      setInventory([]);
      setLoading(false);
    };

    void loadInventory();
  }, [authLoading, inventoryLoading, productsLoading, authError, inventoryError, productsError, user, todayInventory, allProducts, setLocation]);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAvailable = (quantity: number, previousDay: number) => {
    return quantity;
  };

  const handleQuantityChange = (id: number, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    const updated = inventory.map((item) =>
      item.productId === id ? { ...item, quantity: Math.max(0, numValue) } : item
    );
    setInventory(updated);
  };

  const handlePreviousDayChange = (id: number, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    const updated = inventory.map((item) =>
      item.productId === id ? { ...item, previousDayQuantity: Math.max(0, numValue) } : item
    );
    setInventory(updated);
  };

  const saveInventoryField = async (id: number, field: 'quantity' | 'previousDayQuantity', value: string) => {
    const item = inventory.find((entry) => entry.productId === id);
    if (!item) return;

    const parsedValue = value === "" ? 0 : parseInt(value) || 0;
    const normalizedValue = Math.max(0, parsedValue);

    const nextPayload = {
      productId: id,
      quantity: field === 'quantity' ? normalizedValue : item.quantity,
      previousDayQuantity: field === 'previousDayQuantity' ? normalizedValue : item.previousDayQuantity,
    };

    setInventory((currentInventory) =>
      currentInventory.map((entry) =>
        entry.productId === id
          ? {
              ...entry,
              ...(field === 'quantity'
                ? { quantity: normalizedValue }
                : { previousDayQuantity: normalizedValue }),
            }
          : entry
      )
    );

    await upsertInventoryMutation.mutateAsync(nextPayload);
    await refetch();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no debe exceder 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setNewProductImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async () => {
    try {
      console.log('handleAddProduct called', { newProductName, newProductPrice, newProductImage, newProductQuantity, variantsLength: variants.length });
      if (!newProductName.trim()) {
        toast.error("El nombre del producto es obligatorio");
        return;
      }
      
      const price = parsePriceInput(newProductPrice);
      if (isNaN(price) || price < 0) {
        toast.error("El precio debe ser un número válido");
        return;
      }
      
      const quantity = parseInt(newProductQuantity) || 0;
      
      const createdProduct = await createProductMutation.mutateAsync({
        name: newProductName,
        price: price,
        imageData: newProductImage,
      });
      
      await utils.products.list.invalidate();
      const updatedProducts = await utils.products.list.fetch();
      let lastProduct = createdProduct ?? null;
      
      if (lastProduct) {
        await upsertInventoryMutation.mutateAsync({
          productId: lastProduct.id,
          quantity: quantity,
          previousDayQuantity: 0,
        });
      }
      
      await utils.inventory.today.invalidate();
      await utils.inventory.today.fetch();
      
      if (variants.length > 0 && lastProduct) {
        const variantPayloads = buildVariantInventoryPayloads(quantity, variants);
        for (const variant of variantPayloads) {
          const createdVariant = await createVariantMutation.mutateAsync({
            parentProductId: lastProduct.id,
            name: variant.name,
            price: variant.price,
          });

          if (createdVariant) {
            await upsertInventoryMutation.mutateAsync({
              productId: createdVariant.id,
              quantity: variant.quantity,
              previousDayQuantity: variant.previousDayQuantity,
            });
          }
        }
        await utils.products.list.invalidate();
      }
      
      setAlertTitle("Producto Agregado");
      setAlertMessage(`${newProductName} ha sido agregado correctamente${variants.length > 0 ? ` con ${variants.length} variante(s)` : ""}`);
      setAlertKey(prev => prev + 1);
      setShowSuccessAlert(true);
      
      setShowAddProduct(false);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductImage("");
      setNewProductQuantity("");
      setVariants([]);
      setShowVariantsInput(false);
    } catch (error) {
      console.error("Error al agregar producto:", error);
      toast.error("Error al agregar el producto");
    }
  };

  const handleEditProduct = (item: InventoryItem) => {
    setEditingProductId(item.productId);
    setEditProductName(item.name);
    setEditProductPrice(String(item.price));
    setEditProductImage(item.image || "");
    setEditProductImageFile("");
  };

  const handleDeleteProduct = async (item: InventoryItem) => {
    if (!window.confirm(`¿Eliminar el producto ${item.name}?`)) return;

    try {
      await deleteProductMutation.mutateAsync({ id: item.productId });
      await utils.products.list.invalidate();
      await utils.inventory.today.invalidate();
      const refreshedProducts = await utils.products.list.fetch();
      const currentInventory = (todayInventory ?? []).filter((inv: any) => {
        const product = (refreshedProducts ?? []).find((p: any) => p.id === inv.productId);
        return product && product.active !== 0;
      });
      setInventory(currentInventory.map((inv: any) => ({
        ...inv,
        name: (refreshedProducts ?? []).find((p: any) => p.id === inv.productId)?.name || "Producto",
        image: (refreshedProducts ?? []).find((p: any) => p.id === inv.productId)?.image || "",
        price: ((refreshedProducts ?? []).find((p: any) => p.id === inv.productId)?.price || 0) / 100,
      })));
      setAlertTitle("Producto Eliminado");
      setAlertMessage(`${item.name} ha sido eliminado correctamente`);
      setAlertKey(prev => prev + 1);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      toast.error("Error al eliminar el producto");
    }
  };

  const handleSaveProductEdit = async () => {
    if (!editingProductId) return;

    try {
      const price = parsePriceInput(editProductPrice);
      if (isNaN(price) || price < 0) {
        toast.error("El precio debe ser un número válido");
        return;
      }

      await updateProductMutation.mutateAsync({
        id: editingProductId,
        name: editProductName.trim(),
        price,
        imageData: editProductImageFile || (editProductImage.startsWith('data:') ? editProductImage : undefined),
      });

      await utils.products.list.invalidate();
      await utils.inventory.today.invalidate();
      const refreshedProducts = await utils.products.list.fetch();
      const currentInventory = (todayInventory ?? []).filter((inv: any) => {
        const product = (refreshedProducts ?? []).find((p: any) => p.id === inv.productId);
        return product && product.active !== 0;
      });
      setInventory(currentInventory.map((inv: any) => ({
        ...inv,
        name: (refreshedProducts ?? []).find((p: any) => p.id === inv.productId)?.name || "Producto",
        image: (refreshedProducts ?? []).find((p: any) => p.id === inv.productId)?.image || "",
        price: ((refreshedProducts ?? []).find((p: any) => p.id === inv.productId)?.price || 0) / 100,
      })));
      setEditingProductId(null);
      setEditProductName("");
      setEditProductPrice("");
      setEditProductImage("");
      setEditProductImageFile("");
      setAlertTitle("Producto Actualizado");
      setAlertMessage("El producto se ha actualizado correctamente");
      setAlertKey(prev => prev + 1);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      toast.error("Error al actualizar el producto");
    }
  };

  const handleSaveInventory = async () => {
    setSaving(true);
    try {
      for (const item of inventory) {
        await upsertInventoryMutation.mutateAsync({
          productId: item.productId,
          quantity: item.quantity,
          previousDayQuantity: item.previousDayQuantity,
        });
      }

      setAlertTitle("Inventario Guardado");
      setAlertMessage("El inventario se ha guardado correctamente");
      setAlertKey(prev => prev + 1);
      setShowSuccessAlert(true);
      
      await refetch();
    } catch (error) {
      console.error("Error al guardar inventario:", error);
      toast.error("Error al guardar el inventario");
    } finally {
      setSaving(false);
    }
  };

  const totalAvailable = inventory.reduce(
    (sum, item) => sum + calculateAvailable(item.quantity, item.previousDayQuantity),
    0
  );

  if (loading || authLoading || inventoryLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#f97316] border-r-[#f97316] border-b-transparent border-l-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>Cargando inventario...</p>
        </div>
      </div>
    );
  }

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
                <Package className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Inventario
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 relative">
        {/* Stats - Igual que Ventas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  boxShadow: "0 0 16px rgba(249,115,22,0.3)",
                }}
              >
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Total Productos
                </p>
                <p className="text-2xl font-bold" style={{ color: "#f97316" }}>
                  {inventory.length}
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: "0 0 16px rgba(34,197,94,0.3)",
                }}
              >
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Disponible Hoy
                </p>
                <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>
                  {totalAvailable}
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                  boxShadow: "0 0 16px rgba(56,189,248,0.3)",
                }}
              >
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Precio Promedio
                </p>
                <p className="text-2xl font-bold" style={{ color: "#38bdf8" }}>
                  ${inventory.length > 0 ? (inventory.reduce((sum, item) => sum + item.price, 0) / inventory.length).toFixed(0) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative mb-5 animate-fade-in delay-100">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "oklch(0.50 0.01 260)" }}
          />
          <input
            id="search-products"
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-premium w-full h-11 pl-10 pr-10 text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.09)",
              color: "var(--foreground)",
              borderRadius: "0.75rem",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "oklch(0.50 0.01 260)" }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Inventory Grid */}
        {filteredInventory.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl animate-fade-in delay-200"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Package className="w-12 h-12 mx-auto mb-3 opacity-25" style={{ color: "oklch(0.55 0.01 260)" }} />
            <p className="font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
              {searchTerm ? "No se encontraron productos" : "No hay productos en inventario"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddProduct(true)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "rgba(249,115,22,0.12)",
                  color: "#f97316",
                  border: "1px dashed rgba(249,115,22,0.35)",
                }}
              >
                <Plus className="h-4 w-4" />
                Agregar producto
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-3 text-sm font-medium transition-colors"
                style={{ color: "#f97316" }}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={() => setShowAddProduct(true)}
              className="card-product animate-fade-in flex min-h-[220px] items-center justify-center border-dashed"
              style={{
                animationDelay: "200ms",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(12px)",
                border: "1px dashed rgba(255,255,255,0.16)",
                borderRadius: "var(--radius-lg)",
                color: "#f97316",
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Agregar</span>
              </div>
            </button>
            {filteredInventory.map((item, idx) => {
              const available = calculateAvailable(item.quantity, item.previousDayQuantity);
              return (
                <div
                  key={item.productId}
                  className="card-product animate-fade-in"
                  style={{
                    animationDelay: `${idx * 50 + 200}ms`,
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    cursor: "default",
                    position: "relative",
                  }}
                >
                  {/* Imagen */}
                  <div
                    className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.3))",
                    }}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <ImageIcon className="w-12 h-12 opacity-30" style={{ color: "#f97316" }} />
                    )}
                    {editingProductId === item.productId && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs font-medium px-3 py-1 rounded-full" style={{ background: "rgba(249,115,22,0.8)" }}>
                          Editando...
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute top-2 right-2 min-w-7 h-7 rounded-full px-1.5 flex items-center justify-center text-xs font-bold"
                      style={{
                        background: "linear-gradient(135deg, #f97316, #ea580c)",
                        color: "white",
                        boxShadow: "0 0 10px rgba(249,115,22,0.5)",
                        border: "1.5px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      {available}
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Nombre */}
                    {editingProductId === item.productId ? (
                      <div className="space-y-2">
                        <Input
                          value={editProductName}
                          onChange={(e) => setEditProductName(e.target.value)}
                          placeholder="Nombre"
                          className="input-premium text-sm"
                        />
                        <Input
                          value={formatPriceDisplay(editProductPrice)}
                          onChange={(e) => setEditProductPrice(e.target.value.replace(/\./g, ""))}
                          placeholder="Precio"
                          inputMode="numeric"
                          className="input-premium text-sm"
                        />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64 = event.target?.result as string;
                              setEditProductImage(base64);
                              setEditProductImageFile(base64);
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="text-sm"
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingProductId(null);
                              setEditProductName("");
                              setEditProductPrice("");
                              setEditProductImage("");
                              setEditProductImageFile("");
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleSaveProductEdit}
                            className="flex-1"
                            style={{
                              background: "linear-gradient(135deg, #f97316, #ea580c)",
                              color: "white",
                            }}
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--foreground)" }}>
                          {item.name}
                        </h3>
                        <p className="text-[11px] mt-1" style={{ color: "oklch(0.50 0.01 260)" }}>Producto registrado</p>
                      </div>
                    )}

                    {editingProductId !== item.productId && (
                      <>
                        {/* Cantidades */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium block mb-1" style={{ color: "oklch(0.50 0.01 260)" }}>
                              Cantidad Hoy
                            </label>
                            <Button
                              onClick={() => {
                                setEditingField({ itemId: item.productId, field: 'quantity' });
                                setTempValue(item.quantity.toString());
                              }}
                              className="w-full text-center font-bold h-10"
                              style={{
                                background: "rgba(249,115,22,0.08)",
                                border: "1.5px solid rgba(249,115,22,0.25)",
                                color: "#f97316",
                              }}
                            >
                              {item.quantity === 0 ? "-" : item.quantity}
                            </Button>
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1" style={{ color: "oklch(0.50 0.01 260)" }}>
                              Día Anterior
                            </label>
                            <Button
                              onClick={() => {
                                setEditingField({ itemId: item.productId, field: 'previousDayQuantity' });
                                setTempValue(item.previousDayQuantity.toString());
                              }}
                              className="w-full text-center font-bold h-10"
                              style={{
                                background: "rgba(251,146,60,0.08)",
                                border: "1.5px solid rgba(251,146,60,0.25)",
                                color: "#fb923c",
                              }}
                            >
                              {item.previousDayQuantity === 0 ? "-" : item.previousDayQuantity}
                            </Button>
                          </div>
                        </div>

                        {/* Disponible y Precio */}
                        <div className="grid grid-cols-2 gap-2">
                          <div
                            className="rounded-lg p-3 text-center"
                            style={{
                              background: "rgba(34,197,94,0.06)",
                              border: "1px solid rgba(34,197,94,0.15)",
                            }}
                          >
                            <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Disponible</p>
                            <p className="text-xl font-bold" style={{ color: "#22c55e" }}>{available}</p>
                          </div>
                          <div
                            className="rounded-lg p-3 text-center"
                            style={{
                              background: "rgba(56,189,248,0.06)",
                              border: "1px solid rgba(56,189,248,0.15)",
                            }}
                          >
                            <p className="text-xs" style={{ color: "oklch(0.50 0.01 260)" }}>Precio</p>
                            <p className="text-xl font-bold" style={{ color: "#38bdf8" }}>${item.price.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(item)}
                            className="flex-1"
                            style={{
                              borderColor: "rgba(249,115,22,0.2)",
                              color: "#f97316",
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(item)}
                            className="flex-1"
                            style={{
                              borderColor: "rgba(239,68,68,0.2)",
                              color: "#ef4444",
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Keypad Modal */}
      {editingField && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-scale">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                {editingField.field === 'quantity' ? 'Cantidad Hoy' : 'Cantidad Día Anterior'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingField(null)}
                style={{ color: "oklch(0.45 0.01 260)" }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <Input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="text-2xl font-bold text-center input-premium"
                placeholder="0"
              />
              <QuantityKeypad
                value={tempValue}
                onChange={setTempValue}
                maxValue={999}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingField(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (editingField) {
                      await saveInventoryField(editingField.itemId, editingField.field, tempValue);
                    }
                    setEditingField(null);
                  }}
                  className="flex-1"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "white",
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-scale">
          <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                Agregar Nuevo Producto
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddProduct(false);
                  setNewProductName("");
                  setNewProductPrice("");
                  setNewProductImage("");
                  setNewProductQuantity("");
                }}
                style={{ color: "oklch(0.45 0.01 260)" }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Nombre del Producto
                </label>
                <Input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ej: Chorizos"
                  className="input-premium"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Precio ($)
                </label>
                <Input
                  type="text"
                  value={formatPriceDisplay(newProductPrice)}
                  onChange={(e) => setNewProductPrice(e.target.value.replace(/\./g, ""))}
                  placeholder="0"
                  inputMode="numeric"
                  className="input-premium"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Imagen (Opcional)
                </label>
                <p className="text-xs mb-2" style={{ color: "oklch(0.45 0.01 260)" }}>
                  Carga una imagen local (máx 5MB) o ingresa una URL
                </p>
                <div className="flex gap-2 mb-2">
                  <Input                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="flex-1 text-sm"
                  />
                </div>
                <div className="relative mb-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: "oklch(0.20 0.01 260)" }}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2" style={{ background: "var(--card)", color: "oklch(0.45 0.01 260)" }}>o</span>
                  </div>
                </div>
                <Input
                  type="text"
                  value={newProductImage.startsWith('data:') ? '' : newProductImage}
                  onChange={(e) => setNewProductImage(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="input-premium mb-2"
                />
                {newProductImage && (
                  <div className="mt-2 w-full h-32 rounded-lg overflow-hidden" style={{ background: "oklch(0.15 0.01 260)" }}>
                    <img src={newProductImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Cantidad Inicial
                </label>
                <Input
                  type="number"
                  value={newProductQuantity}
                  onChange={(e) => setNewProductQuantity(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="input-premium"
                />
              </div>
              
              <div className="border-t pt-4" style={{ borderColor: "oklch(0.20 0.01 260)" }}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                    Variantes (Opcional)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVariantsInput(!showVariantsInput)}
                  >
                    {showVariantsInput ? "Ocultar" : "Agregar"}
                  </Button>
                </div>
                
                {showVariantsInput && (
                  <div className="space-y-2 rounded-lg p-3" style={{ background: "oklch(0.15 0.01 260)" }}>
                    <p className="text-xs" style={{ color: "oklch(0.45 0.01 260)" }}>
                      Ej: Chorizos Crudos, Chorizos Asados
                    </p>
                    {variants.map((variant, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          type="text"
                          value={variant.name}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[idx].name = e.target.value;
                            setVariants(newVariants);
                          }}
                          placeholder="Nombre"
                          className="input-premium flex-1 text-sm"
                        />
                        <Input
                          type="text"
                          value={formatPriceDisplay(variant.price)}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[idx].price = e.target.value.replace(/\./g, "");
                            setVariants(newVariants);
                          }}
                          placeholder="Precio"
                          inputMode="numeric"
                          className="input-premium w-24 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                          style={{ color: "#ef4444" }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVariants([...variants, { name: "", price: "" }])}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Variante
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddProduct(false);
                    setNewProductName("");
                    setNewProductPrice("");
                    setNewProductImage("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddProduct}
                  className="flex-1"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    color: "white",
                    boxShadow: "0 0 16px rgba(34,197,94,0.3)",
                  }}
                >
                  Agregar Producto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      <RobustAlert
        key={alertKey}
        open={showSuccessAlert}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setShowSuccessAlert(false)}
        onOpenChange={() => setShowSuccessAlert(false)}
      />
    </div>
  );
}
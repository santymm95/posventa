import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RobustAlert } from "@/components/RobustAlert";
import { ArrowLeft, Image as ImageIcon, Search, X, ShoppingBag, Banknote, Smartphone, Clock, Package, GripVertical, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { QuantityKeypad } from "@/components/QuantityKeypad";
import { useSound } from "@/hooks/useSound";
import { trpc } from "@/lib/trpc";
import { formatPriceInputDisplay, parsePriceInput } from "@/lib/priceFormatter";
import { fetchSupabaseInventory, fetchSupabaseProducts } from "@/lib/supabaseData";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  productId?: number;
}

interface InventoryItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  previousDayQuantity: number;
  image: string;
  price?: number;
}

const PAYMENT_OPTIONS = [
  { value: "efectivo" as const, label: "Efectivo", icon: Banknote, color: "#22c55e" },
  { value: "transferencia" as const, label: "Transferencia", icon: Smartphone, color: "#38bdf8" },
  { value: "fiado" as const, label: "Fiado", icon: Clock, color: "#fb923c" },
];

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// Componente de tarjeta sortable
function SortableProductCard({ 
  product, 
  available, 
  isOutOfStock, 
  onProductClick,
  index 
}: { 
  product: Product;
  available: number;
  isOutOfStock: boolean;
  onProductClick: () => void;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`card-product animate-fade-in ${isOutOfStock ? "opacity-50" : ""} ${isDragging ? "shadow-2xl scale-105" : ""}`}
      style={{
        ...style,
        animationDelay: `${index * 50 + 200}ms`,
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        cursor: "default",
        position: "relative",
      }}
      onClick={onProductClick}
    >
      {/* Handle de arrastre */}
      <div
        {...listeners}
        className="absolute top-1 left-1 z-10 p-1 rounded-md hover:bg-white/10 cursor-grab active:cursor-grabbing transition-colors"
        style={{ color: "oklch(0.45 0.01 260)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Imagen / banner - Ahora más cuadrado */}
      <div
        className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
        style={{
          background: isOutOfStock
            ? "linear-gradient(135deg, rgba(100,116,139,0.3), rgba(71,85,105,0.3))"
            : "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.3))",
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <ImageIcon
            className="w-12 h-12 opacity-30"
            style={{ color: isOutOfStock ? "oklch(0.50 0.01 260)" : "#f97316" }}
          />
        )}
        {/* Badge de cantidad */}
        <div
          className="absolute top-2 right-2 min-w-7 h-7 rounded-full px-1.5 flex items-center justify-center text-xs font-bold"
          style={
            isOutOfStock
              ? {
                  background: "rgba(100,116,139,0.7)",
                  color: "oklch(0.70 0.01 260)",
                  border: "1.5px solid rgba(255,255,255,0.10)",
                }
              : {
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "white",
                  boxShadow: "0 0 10px rgba(249,115,22,0.5)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }
          }
        >
          {available}
        </div>
        {/* Sin stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.5)",
                color: "oklch(0.65 0.01 260)",
                backdropFilter: "blur(4px)",
              }}
            >
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-semibold text-sm leading-snug mb-1 text-center"
          style={{ color: isOutOfStock ? "oklch(0.50 0.01 260)" : "var(--foreground)" }}
        >
          {product.name}
        </h3>
        <p
          className="text-lg font-bold text-center"
          style={{
            color: isOutOfStock ? "oklch(0.45 0.01 260)" : "#f97316",
            textShadow: isOutOfStock ? "none" : "0 0 12px rgba(249,115,22,0.3)",
          }}
        >
          {formatCOP(product.price)}
        </p>
      </div>
    </div>
  );
}

export default function Sales() {
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "fiado">("efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [saleStep, setSaleStep] = useState<"details" | "payment" | "summary">("details");
  const [inventory, setInventory] = useState<Record<number, InventoryItem>>({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [lastSaleMessage, setLastSaleMessage] = useState("");
  const [alertKey, setAlertKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { playClickSound, playSuccessSound } = useSound();

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo 8px de arrastre para activar
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: user } = trpc.auth.me.useQuery();
  const { data: todayInventory, refetch: refetchInventory } = trpc.inventory.today.useQuery();
  const { data: allProducts } = trpc.products.list.useQuery();

  const createSaleMutation = trpc.sales.create.useMutation();

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const loadProducts = async () => {
      if (user === null) {
        setLocation("/");
        return;
      }

      const supabaseProducts = await fetchSupabaseProducts();
      const supabaseInventory = await fetchSupabaseInventory();

      const dbProducts = (allProducts ?? []).filter((p: any) => p.active !== 0);
      const dbInventoryRows = todayInventory ?? [];
      const hasDbData = dbProducts.length > 0 || dbInventoryRows.length > 0;
      const hasSupabaseData =
        Array.isArray(supabaseProducts) &&
        Array.isArray(supabaseInventory) &&
        (supabaseProducts.length > 0 || supabaseInventory.length > 0);

      if (!hasDbData && hasSupabaseData) {
        const activeProducts = supabaseProducts.filter((p: any) => p.active !== 0);
        const inventoryMap: Record<number, InventoryItem> = {};
        const mappedInventory: InventoryItem[] = [];
        const inventoryGroups = new Map<number, InventoryItem>();

        activeProducts.forEach((product: any) => {
          const inventoryEntry = supabaseInventory.find((inv: any) => inv.productId === product.id);
          const parentInventoryEntry = product.parentProductId
            ? supabaseInventory.find((inv: any) => inv.productId === product.parentProductId)
            : undefined;
          const sourceInventory = parentInventoryEntry || inventoryEntry;

          if (!sourceInventory) return;

          const groupKey = product.parentProductId || product.id;
          const normalizedInventory: InventoryItem = {
            id: Number(sourceInventory.id),
            productId: Number(sourceInventory.productId),
            name: product?.name || "Producto",
            image: product?.image || "",
            price: (product?.price || 0) / 100,
            quantity: Number(sourceInventory?.quantity ?? 0),
            previousDayQuantity: Number(sourceInventory?.previousDayQuantity ?? 0),
          };

          if (!inventoryGroups.has(groupKey)) {
            const item: InventoryItem = {
              ...normalizedInventory,
              name: product?.name || "Producto",
              image: product?.image || "",
              price: (product?.price || 0) / 100,
            };
            inventoryGroups.set(groupKey, item);
            mappedInventory.push(item);
          }

          const item = inventoryGroups.get(groupKey) || {
            ...normalizedInventory,
            name: product?.name || "Producto",
            image: product?.image || "",
            price: (product?.price || 0) / 100,
          };

          inventoryMap[product.id] = item;
        });

        setInventory(inventoryMap);
        setInventoryItems(mappedInventory);

        const mainProducts = activeProducts.filter((p: any) => !p.parentProductId);
        const dynamicProducts: Product[] = mainProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: typeof product.price === "number" ? product.price / 100 : 0,
          category: product.category,
          image: product.image || "",
          productId: product.id,
        }));

        const variants = activeProducts.filter((p: any) => p.parentProductId);
        const variantProducts: Product[] = variants.map((variant: any) => ({
          id: variant.id,
          name: variant.name,
          price: typeof variant.price === "number" ? variant.price / 100 : 0,
          category: variant.category,
          image: variant.image || "",
          productId: variant.id,
        }));

        const savedOrder = localStorage.getItem('productOrder');
        let sortedProducts = [...dynamicProducts, ...variantProducts];
        
        if (savedOrder) {
          try {
            const order = JSON.parse(savedOrder);
            const orderedProducts = order
              .map((id: number) => sortedProducts.find(p => p.id === id))
              .filter(Boolean) as Product[];
            const existingIds = new Set(orderedProducts.map(p => p.id));
            const newProducts = sortedProducts.filter(p => !existingIds.has(p.id));
            sortedProducts = [...orderedProducts, ...newProducts];
          } catch (e) {
            console.error('Error al cargar el orden guardado:', e);
          }
        }
        
        setProducts(sortedProducts);
        return;
      }

      if (todayInventory && allProducts) {
        const activeProducts = allProducts.filter((p: any) => p.active !== 0);
        const inventoryMap: Record<number, InventoryItem> = {};
        const mappedInventory: InventoryItem[] = [];
        const inventoryGroups = new Map<number, InventoryItem>();

        activeProducts.forEach((product: any) => {
          const inventoryEntry = todayInventory.find((inv: any) => inv.productId === product.id);
          const parentInventoryEntry = product.parentProductId
            ? todayInventory.find((inv: any) => inv.productId === product.parentProductId)
            : undefined;
          const sourceInventory = parentInventoryEntry || inventoryEntry;

          if (!sourceInventory) return;

          const groupKey = product.parentProductId || product.id;
          if (!inventoryGroups.has(groupKey)) {
            const item: InventoryItem = {
              ...sourceInventory,
              name: product?.name || "Producto",
              image: product?.image || "",
              price: (product?.price || 0) / 100,
            };
            inventoryGroups.set(groupKey, item);
            mappedInventory.push(item);
          }

          const item = inventoryGroups.get(groupKey) || {
            ...sourceInventory,
            name: product?.name || "Producto",
            image: product?.image || "",
            price: (product?.price || 0) / 100,
          };

          inventoryMap[product.id] = item;
        });

        setInventory(inventoryMap);
        setInventoryItems(mappedInventory);

        const mainProducts = activeProducts.filter((p: any) => !p.parentProductId);
        const dynamicProducts: Product[] = mainProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: typeof product.price === "number" ? product.price / 100 : 0,
          category: product.category,
          image: product.image || "",
          productId: product.id,
        }));

        const variants = activeProducts.filter((p: any) => p.parentProductId);
        const variantProducts: Product[] = variants.map((variant: any) => ({
          id: variant.id,
          name: variant.name,
          price: typeof variant.price === "number" ? variant.price / 100 : 0,
          category: variant.category,
          image: variant.image || "",
          productId: variant.id,
        }));

        const savedOrder = localStorage.getItem('productOrder');
        let sortedProducts = [...dynamicProducts, ...variantProducts];
        
        if (savedOrder) {
          try {
            const order = JSON.parse(savedOrder);
            const orderedProducts = order
              .map((id: number) => sortedProducts.find(p => p.id === id))
              .filter(Boolean) as Product[];
            const existingIds = new Set(orderedProducts.map(p => p.id));
            const newProducts = sortedProducts.filter(p => !existingIds.has(p.id));
            sortedProducts = [...orderedProducts, ...newProducts];
          } catch (e) {
            console.error('Error al cargar el orden guardado:', e);
          }
        }
        
        setProducts(sortedProducts);
      }
    };

    void loadProducts();
  }, [user, todayInventory, allProducts, setLocation]);

  const getAvailableQuantity = (productId: number): number => {
    const item = inventory[productId];
    if (!item) return 0;
    return item.quantity || 0;
  };

  const handleSale = async () => {
    if (!selectedProduct || !quantity) {
      toast.error("Selecciona cantidad");
      return;
    }
    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error("Cantidad debe ser mayor a 0");
      return;
    }
    const available = getAvailableQuantity(selectedProduct.id);
    if (qty > available) {
      toast.error(`Solo hay ${available} disponibles`);
      return;
    }
    setLoading(true);
    try {
      await createSaleMutation.mutateAsync({
        productId: selectedProduct.id,
        quantity: qty,
        unitPrice: Math.round(selectedProduct.price * 100),
        paymentMethod: paymentMethod,
      });
      playSuccessSound();
      const totalPrice = qty * selectedProduct.price;
      setLastSaleMessage(`${selectedProduct.name} x${qty} - ${formatCOP(totalPrice)}`);
      setShowSuccessAlert(true);
      setAlertKey((prev) => prev + 1);
      await refetchInventory();
      setSelectedProduct(null);
      setQuantity("");
      setSaleStep("details");
    } catch (error) {
      console.error("Error registering sale:", error);
      toast.error("Error al registrar venta");
    } finally {
      setLoading(false);
    }
  };

  const totalAvailable = inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalAmount = selectedProduct ? parseInt(quantity || "0") * selectedProduct.price : 0;
  const receivedAmount = paymentMethod === "efectivo"
    ? parsePriceInput(cashReceived)
    : totalAmount;
  const changeAmount = Math.max(0, receivedAmount - totalAmount);
  const missingAmount = Math.max(0, totalAmount - receivedAmount);

  const handleCloseDialog = () => {
    setSelectedProduct(null);
    setQuantity("");
    setPaymentMethod("efectivo");
    setCashReceived("");
    setSaleStep("details");
  };

  const handleContinueToSummary = () => {
    if (!quantity) {
      toast.error("Selecciona cantidad");
      return;
    }
    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error("Cantidad debe ser mayor a 0");
      return;
    }
    const available = getAvailableQuantity(selectedProduct?.id || 0);
    if (selectedProduct && qty > available) {
      toast.error(`Solo hay ${available} disponibles`);
      return;
    }
    if (paymentMethod === "efectivo" && missingAmount > 0) {
      toast.error("Falta por cobrar el valor del billete");
      return;
    }
    setSaleStep("summary");
  };

  // Manejar el fin del drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((item) => item.id === active.id);
      const newIndex = products.findIndex((item) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newProducts = arrayMove(products, oldIndex, newIndex);
        setProducts(newProducts);
        
        // Guardar el orden en localStorage
        const order = newProducts.map(p => p.id);
        localStorage.setItem('productOrder', JSON.stringify(order));
      }
    }
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

      {/* Header con logo más grande */}
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
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                Ventas
              </h1>
            </div>
          </div>

          {/* Logo más grande */}
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

      {/* Content */}
      <main className="container mx-auto px-4 py-6 relative">
        {/* Indicador de arrastre */}
        <div className="flex items-center justify-between mb-3 animate-fade-in delay-100">
          <p className="text-xs" style={{ color: "oklch(0.45 0.01 260)" }}>
            <GripVertical className="w-3 h-3 inline mr-1" />
            Arrastra las tarjetas para reordenar
          </p>
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

        {/* Grid de productos con DnD */}
        {filteredProducts.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl animate-fade-in delay-200"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-25" style={{ color: "oklch(0.55 0.01 260)" }} />
            <p className="font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
              No se encontraron productos
            </p>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredProducts.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product, i) => {
                  const available = getAvailableQuantity(product.id);
                  const isOutOfStock = available === 0;
                  return (
                    <SortableProductCard
                      key={product.id}
                      product={product}
                      available={available}
                      isOutOfStock={isOutOfStock}
                      index={i}
                      onProductClick={() => {
                        if (isOutOfStock) {
                          toast.error("Sin stock disponible");
                          return;
                        }
                        playClickSound();
                        setSelectedProduct(product);
                        setQuantity("");
                        setPaymentMethod("efectivo");
                        setCashReceived("");
                        setSaleStep("details");
                      }}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-fade-in">
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
                  Total Disponible
                </p>
                <p className="text-2xl font-bold" style={{ color: "#f97316" }}>
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
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: "0 0 16px rgba(34,197,94,0.3)",
                }}
              >
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Productos
                </p>
                <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>
                  {products.length}
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
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.01 260)" }}>
                  Ventas Hoy
                </p>
                <p className="text-2xl font-bold" style={{ color: "#38bdf8" }}>
                  {inventoryItems.filter(item => item.quantity > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de venta */}
      {selectedProduct && (
        <>
          <Dialog open={!!selectedProduct && saleStep === "details"} onOpenChange={(open) => (!open ? handleCloseDialog() : undefined)}>
            <DialogContent
              className="max-w-sm"
              style={{
                background: "rgba(18, 14, 12, 0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(249,115,22,0.18)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(249,115,22,0.08)",
              }}
            >
              <DialogHeader>
                <DialogTitle
                  className="text-lg font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  Vender {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.10))",
                    border: "1px solid rgba(249,115,22,0.20)",
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>
                    Precio Unitario
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{
                      color: "#f97316",
                      textShadow: "0 0 20px rgba(249,115,22,0.4)",
                    }}
                  >
                    {formatCOP(selectedProduct.price)}
                  </p>
                </div>

                <div>
                  <label
                    className="text-sm font-medium block mb-2"
                    style={{ color: "oklch(0.65 0.01 260)" }}
                  >
                    Cantidad
                  </label>
                  <QuantityKeypad
                    value={quantity}
                    onChange={setQuantity}
                    maxValue={getAvailableQuantity(selectedProduct.id)}
                  />
                </div>

                {quantity && (
                  <div
                    className="rounded-xl p-3 text-center animate-fade-in-scale"
                    style={{
                      background: "rgba(56,189,248,0.08)",
                      border: "1px solid rgba(56,189,248,0.18)",
                    }}
                  >
                    <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                      Total a cobrar
                    </p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: "#38bdf8" }}
                    >
                      {formatCOP(parseInt(quantity) * selectedProduct.price)}
                    </p>
                  </div>
                )}

                <div>
                  <label
                    className="text-sm font-medium block mb-2"
                    style={{ color: "oklch(0.65 0.01 260)" }}
                  >
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = paymentMethod === opt.value;
                      return (
                        <button
                          id={`payment-${opt.value}`}
                          key={opt.value}
                          className={`payment-btn flex flex-col items-center gap-1 py-2.5 ${isActive ? "active" : ""}`}
                          onClick={() => setPaymentMethod(opt.value)}
                          style={
                            isActive
                              ? {
                                  background: `${opt.color}18`,
                                  borderColor: `${opt.color}60`,
                                  color: opt.color,
                                  boxShadow: `0 0 12px ${opt.color}25`,
                                }
                              : undefined
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  id="btn-continue-sale"
                  onClick={() => setSaleStep("payment")}
                  disabled={!quantity || loading}
                  className="btn-shimmer w-full h-12 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  style={!quantity || loading ? { background: "rgba(249,115,22,0.25)", animation: "none" } : undefined}
                >
                  Continuar
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedProduct && saleStep === "payment"} onOpenChange={(open) => (!open ? handleCloseDialog() : undefined)}>
            <DialogContent
              className="max-w-sm"
              style={{
                background: "rgba(18, 14, 12, 0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(249,115,22,0.18)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(249,115,22,0.08)",
              }}
            >
              <DialogHeader>
                <DialogTitle
                  className="text-lg font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  Confirmar venta
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-xl p-3" style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.18)" }}>
                  <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                    Producto
                  </p>
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {selectedProduct.name} x{quantity}
                  </p>
                </div>

                <div className="rounded-xl p-3" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)" }}>
                  <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                    Total a cobrar
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "#f97316" }}>
                    {formatCOP(parseInt(quantity) * selectedProduct.price)}
                  </p>
                </div>

                <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                  <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                    Método de pago
                  </p>
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {PAYMENT_OPTIONS.find((opt) => opt.value === paymentMethod)?.label}
                  </p>
                </div>

                {paymentMethod === "efectivo" && (
                  <div className="space-y-3 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                    <div>
                      <label className="text-sm font-medium block mb-2" style={{ color: "oklch(0.65 0.01 260)" }}>
                        Valor del billete / moneda
                      </label>
                      <QuantityKeypad
                        value={cashReceived}
                        onChange={(value) => {
                          const normalized = formatPriceInputDisplay(value);
                          setCashReceived(normalized);
                        }}
                        maxValue={9999999}
                      />
                    </div>

                    <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>
                        {missingAmount > 0 ? "Falta por cobrar" : "Devuelta"}
                      </p>
                      <p className="text-xl font-bold" style={{ color: missingAmount > 0 ? "#fb923c" : "#22c55e" }}>
                        {formatCOP(missingAmount > 0 ? missingAmount : changeAmount)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSaleStep("details")}
                    className="flex-1 h-11 rounded-xl font-semibold"
                    style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)" }}
                  >
                    Volver
                  </button>
                  <button
                    id="btn-confirm-sale"
                    onClick={handleContinueToSummary}
                    disabled={!quantity || loading || (paymentMethod === "efectivo" && missingAmount > 0)}
                    className="flex-1 btn-shimmer h-11 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    style={
                      !quantity || loading || (paymentMethod === "efectivo" && missingAmount > 0)
                        ? { background: "rgba(249,115,22,0.25)", animation: "none" }
                        : undefined
                    }
                  >
                    {loading ? "Procesando..." : "Ver resumen"}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedProduct && saleStep === "summary"} onOpenChange={(open) => (!open ? handleCloseDialog() : undefined)}>
            <DialogContent
              className="max-w-md"
              style={{
                background: "rgba(18, 14, 12, 0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(249,115,22,0.18)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(249,115,22,0.08)",
              }}
            >
              <DialogHeader>
                <DialogTitle
                  className="text-lg font-bold flex items-center gap-2"
                  style={{ color: "var(--foreground)" }}
                >
                  <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
                  Resumen de venta
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(249,115,22,0.14))",
                    border: "1px solid rgba(249,115,22,0.22)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] mb-2" style={{ color: "oklch(0.55 0.01 260)" }}>
                    Listo para registrar
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "#f97316" }}>
                    {formatCOP(totalAmount)}
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>Producto</p>
                    <p className="font-semibold" style={{ color: "var(--foreground)" }}>{selectedProduct.name}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>Cantidad</p>
                    <p className="font-semibold" style={{ color: "var(--foreground)" }}>{quantity} unidad/es</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>Precio unitario</p>
                    <p className="font-semibold" style={{ color: "var(--foreground)" }}>{formatCOP(selectedProduct.price)}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>Método de pago</p>
                    <p className="font-semibold" style={{ color: "var(--foreground)" }}>{PAYMENT_OPTIONS.find((opt) => opt.value === paymentMethod)?.label}</p>
                  </div>
                  {paymentMethod === "efectivo" && (
                    <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                      <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.01 260)" }}>Recibido / cambio</p>
                      <p className="font-semibold" style={{ color: missingAmount > 0 ? "#fb923c" : "#22c55e" }}>
                        {formatCOP(parsePriceInput(cashReceived))} • {missingAmount > 0 ? `Falta ${formatCOP(missingAmount)}` : `Cambio ${formatCOP(changeAmount)}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSaleStep("payment")}
                    className="flex-1 h-11 rounded-xl font-semibold"
                    style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)" }}
                  >
                    Volver
                  </button>
                  <button
                    id="btn-register-sale"
                    onClick={handleSale}
                    disabled={loading}
                    className="flex-1 btn-shimmer h-11 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    style={loading ? { background: "rgba(249,115,22,0.25)", animation: "none" } : undefined}
                  >
                    {loading ? "Procesando..." : "Registrar venta"}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <RobustAlert
        key={alertKey}
        open={showSuccessAlert}
        title="Venta Registrada"
        message={lastSaleMessage}
        onConfirm={() => setShowSuccessAlert(false)}
        onOpenChange={() => setShowSuccessAlert(false)}
      />
    </div>
  );
}
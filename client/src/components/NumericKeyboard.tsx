import { X, Delete } from "lucide-react";
import { useState, useCallback } from "react";

interface NumericKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  max?: number;
}

export function NumericKeyboard({ value, onChange, onClose, max }: NumericKeyboardProps) {
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const handleNumber = useCallback(
    (num: number) => {
      const newValue = value + num.toString();
      const numValue = parseInt(newValue) || 0;
      if (!max || numValue <= max) {
        onChange(newValue);
      }
    },
    [value, onChange, max]
  );

  const handleBackspace = useCallback(() => {
    onChange(value.slice(0, -1));
  }, [value, onChange]);

  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  /* ---- Estilos base ---- */
  const base: React.CSSProperties = {
    padding: "1rem",
    fontWeight: "700",
    borderRadius: "0.65rem",
    minHeight: "4rem",
    minWidth: "100%",
    transition: "all 0.14s ease",
    touchAction: "manipulation",
    WebkitUserSelect: "none",
    userSelect: "none" as any,
    WebkitTouchCallout: "none",
    cursor: "pointer",
    fontSize: "1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const numStyle = (key: string): React.CSSProperties => ({
    ...base,
    background: activeButton === key ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.05)",
    border: `1.5px solid ${activeButton === key ? "rgba(249,115,22,0.45)" : "rgba(255,255,255,0.09)"}`,
    color: activeButton === key ? "#f97316" : "oklch(0.88 0.01 60)",
    transform: activeButton === key ? "scale(0.93)" : "scale(1)",
    boxShadow: activeButton === key ? "0 0 12px rgba(249,115,22,0.2)" : "none",
  });

  const clearStyle = (key: string): React.CSSProperties => ({
    ...base,
    background: activeButton === key ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.08)",
    border: `1.5px solid ${activeButton === key ? "rgba(239,68,68,0.55)" : "rgba(239,68,68,0.22)"}`,
    color: "#f87171",
    transform: activeButton === key ? "scale(0.93)" : "scale(1)",
    fontSize: "0.85rem",
  });

  const closeStyle = (key: string): React.CSSProperties => ({
    ...base,
    background:
      activeButton === key
        ? "linear-gradient(135deg,#c2410c,#b45309)"
        : "linear-gradient(135deg,#f97316,#ea580c)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    color: "#ffffff",
    transform: activeButton === key ? "scale(0.93)" : "scale(1)",
    boxShadow: "0 0 16px rgba(249,115,22,0.35)",
  });

  const press = (key: string) => setActiveButton(key);
  const release = () => setActiveButton(null);

  const numKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 9999,
        pointerEvents: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          background: "rgba(16,12,10,0.97)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(249,115,22,0.18)",
          borderTopLeftRadius: "1.25rem",
          borderTopRightRadius: "1.25rem",
          padding: "1.25rem 1rem 1.5rem",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.06)",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Display */}
        <div
          style={{
            background: "rgba(249,115,22,0.07)",
            border: "1.5px solid rgba(249,115,22,0.20)",
            borderRadius: "0.75rem",
            padding: "0.875rem 1.25rem",
            textAlign: "right",
            marginBottom: "1rem",
          }}
        >
          <p style={{ color: "oklch(0.50 0.01 260)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
            Cantidad
          </p>
          <p
            style={{
              fontSize: "2.5rem",
              fontWeight: "800",
              color: value ? "#f97316" : "oklch(0.35 0.01 260)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              textShadow: value ? "0 0 24px rgba(249,115,22,0.4)" : "none",
            }}
          >
            {value || "0"}
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {numKeys.map((n) => (
            <button
              key={n}
              type="button"
              onMouseDown={() => press(String(n))}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={() => press(String(n))}
              onTouchEnd={release}
              onTouchCancel={release}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNumber(n); }}
              style={numStyle(String(n))}
            >
              {n}
            </button>
          ))}

          {/* Limpiar (span 2) */}
          <button
            type="button"
            onMouseDown={() => press("clear")}
            onMouseUp={release}
            onMouseLeave={release}
            onTouchStart={() => press("clear")}
            onTouchEnd={release}
            onTouchCancel={release}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClear(); }}
            style={{ ...clearStyle("clear"), gridColumn: "span 2" }}
          >
            Limpiar
          </button>

          {/* Backspace */}
          <button
            type="button"
            onMouseDown={() => press("back")}
            onMouseUp={release}
            onMouseLeave={release}
            onTouchStart={() => press("back")}
            onTouchEnd={release}
            onTouchCancel={release}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleBackspace(); }}
            style={clearStyle("back")}
          >
            <Delete style={{ width: "1.4rem", height: "1.4rem" }} />
          </button>

          {/* 0 (span 2) */}
          <button
            type="button"
            onMouseDown={() => press("0")}
            onMouseUp={release}
            onMouseLeave={release}
            onTouchStart={() => press("0")}
            onTouchEnd={release}
            onTouchCancel={release}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNumber(0); }}
            style={{ ...numStyle("0"), gridColumn: "span 2" }}
          >
            0
          </button>

          {/* Cerrar */}
          <button
            type="button"
            onMouseDown={() => press("close")}
            onMouseUp={release}
            onMouseLeave={release}
            onTouchStart={() => press("close")}
            onTouchEnd={release}
            onTouchCancel={release}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            style={closeStyle("close")}
          >
            <X style={{ width: "1.4rem", height: "1.4rem" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

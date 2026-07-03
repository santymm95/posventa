import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { useSound } from "@/hooks/useSound";
import { Delete } from "lucide-react";

interface QuantityKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxValue?: number;
  label?: string;
}

export function QuantityKeypad({ value, onChange, maxValue, label = "Cantidad" }: QuantityKeypadProps) {
  const { playClickSound } = useSound();

  const handleNumberClick = useCallback(
    (num: number) => {
      playClickSound();
      if (num === 0 && value === "") return;
      const newVal = value + num.toString();
      const numValue = parseInt(newVal) || 0;
      if (!maxValue || numValue <= maxValue) {
        onChange(newVal);
      }
    },
    [value, onChange, maxValue, playClickSound]
  );

  const handleBackspace = useCallback(() => {
    playClickSound();
    onChange(value.slice(0, -1));
  }, [value, onChange, playClickSound]);

  const handleClearAll = useCallback(() => {
    playClickSound();
    onChange("");
  }, [onChange, playClickSound]);

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const numBtnStyle: React.CSSProperties = {
    height: "3.25rem",
    fontSize: "1.25rem",
    fontWeight: "700",
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(255,255,255,0.09)",
    borderRadius: "0.625rem",
    color: "var(--foreground)",
    transition: "all 0.15s ease",
    cursor: "pointer",
    touchAction: "manipulation",
  };

  return (
    <div className="space-y-3">
      {/* Display */}
      <div
        style={{
          background: "rgba(249,115,22,0.08)",
          border: "1.5px solid rgba(249,115,22,0.22)",
          borderRadius: "0.75rem",
          padding: "0.875rem 1rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            color: value ? "#f97316" : "oklch(0.38 0.01 260)",
            letterSpacing: "-0.03em",
            textShadow: value ? "0 0 24px rgba(249,115,22,0.4)" : "none",
            lineHeight: 1,
            minHeight: "2.5rem",
          }}
        >
          {value || "—"}
        </p>
        {maxValue !== undefined && (
          <p style={{ fontSize: "0.7rem", color: "oklch(0.48 0.01 260)", marginTop: "0.25rem" }}>
            máx: {maxValue}
          </p>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            style={numBtnStyle}
            onClick={() => handleNumberClick(num)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(249,115,22,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(249,115,22,0.35)";
              (e.currentTarget as HTMLButtonElement).style.color = "#f97316";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            {num}
          </button>
        ))}

        {/* Backspace */}
        <button
          type="button"
          style={{
            ...numBtnStyle,
            background: "rgba(239,68,68,0.10)",
            border: "1.5px solid rgba(239,68,68,0.22)",
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleBackspace}
        >
          <Delete style={{ width: "1.2rem", height: "1.2rem" }} />
        </button>

        {/* 0 */}
        <button
          type="button"
          style={{
            ...numBtnStyle,
            opacity: value === "" ? 0.4 : 1,
            cursor: value === "" ? "not-allowed" : "pointer",
          }}
          onClick={() => handleNumberClick(0)}
          disabled={value === ""}
        >
          0
        </button>

        {/* Clear */}
        <button
          type="button"
          style={{
            ...numBtnStyle,
            background: "rgba(239,68,68,0.10)",
            border: "1.5px solid rgba(239,68,68,0.22)",
            color: "#f87171",
            fontSize: "0.75rem",
            fontWeight: "700",
          }}
          onClick={handleClearAll}
        >
          LIMPIAR
        </button>
      </div>
    </div>
  );
}

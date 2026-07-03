import React from "react";

/**
 * Formatea un número como precio con separador de miles (punto)
 * Ejemplo: 20000 → "20.000"
 */
export function formatPriceDisplay(value: string | number): string {
  if (!value) return "";
  
  // Convertir a string y remover caracteres no numéricos excepto punto decimal
  const stringValue = String(value).replace(/[^\d.]/g, "");
  
  // Si no hay nada, retornar vacío
  if (!stringValue) return "";
  
  // Dividir por punto decimal si existe
  const parts = stringValue.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "";
  
  // Agregar separador de miles al parte entera
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Recombinar
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Extrae el valor numérico de un precio formateado
 * Ejemplo: "20.000" → 20000
 */
export function parsePriceInput(value: string): number {
  if (!value) return 0;
  
  // Remover todos los puntos (separadores de miles)
  const cleaned = value.replace(/\./g, "");
  
  // Convertir a número
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

export function formatPriceInputDisplay(value: string): string {
  if (value === "") return "";

  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  return formatPriceDisplay(cleaned);
}

/**
 * Hook para manejar cambios en inputs de precio con formato automático
 */
export function useFormattedPrice(initialValue: string = "") {
  const [displayValue, setDisplayValue] = React.useState(initialValue);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatPriceDisplay(rawValue);
    setDisplayValue(formatted);
  };
  
  const getValue = (): number => {
    return parsePriceInput(displayValue);
  };
  
  return {
    displayValue,
    setDisplayValue: (value: string) => setDisplayValue(formatPriceDisplay(value)),
    handleChange,
    getValue,
  };
}

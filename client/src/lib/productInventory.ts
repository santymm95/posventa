export interface VariantInventoryDraft {
  name: string;
  price: number;
  quantity: number;
  previousDayQuantity: number;
}

export function buildVariantInventoryPayloads(
  parentQuantity: number,
  variants: Array<{ name: string; price?: string }>
): VariantInventoryDraft[] {
  return variants
    .filter((variant) => variant.name.trim())
    .map((variant) => ({
      name: variant.name.trim(),
      price: Number.parseFloat(variant.price || "0") || 0,
      quantity: parentQuantity,
      previousDayQuantity: 0,
    }));
}

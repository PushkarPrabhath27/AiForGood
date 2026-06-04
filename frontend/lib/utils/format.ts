/**
 * Format raw hemoglobin float values into standard medical display strings.
 */
export function formatHb(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "-- g/dL";
  }
  return `${value.toFixed(1)} g/dL`;
}

/**
 * Format float/integer rates into percentage strings.
 */
export function formatConfidence(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "--%";
  }
  // If the percentage was passed as fraction (e.g. 0.89) instead of index (89)
  const pct = value <= 1 && value > 0 ? Math.round(value * 100) : Math.round(value);
  return `${pct}%`;
}

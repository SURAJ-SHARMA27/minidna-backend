export function generateFingerprint(extracted: any): string {
  return [
    extracted.brand,
    extracted.product_line,
    extracted.core_type,
    extracted.target_user
  ]
    .filter(Boolean)
    .map(v => v.toLowerCase().trim())
    .join("|");
}

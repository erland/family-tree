// src/utils/location.ts

/**
 * Format a Swedish-style location string from city, congregation, and region.
 * - Joins available parts with comma + space (", ").
 * - Skips undefined/empty fields automatically.
 * - Example:
 *   formatLocation({ city: "Luleå", congregation: "Nederluleå", region: "Norrbotten" })
 *   → "Luleå, Nederluleå, Norrbotten"
 * - Example with missing fields:
 *   formatLocation({ city: "Umeå" }) → "Umeå"
 */
export function formatLocation({
  city,
  congregation,
  region,
}: {
  city?: string;
  congregation?: string;
  region?: string;
}): string {
  // Trim whitespace and remove empty parts
  const parts = [city, congregation, region]
    .map((v) => (v ? String(v).trim() : ""))
    .filter((v) => v.length > 0);

  return parts.join(", ");
}
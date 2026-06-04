export type BloodType = "A" | "B" | "AB" | "O";
export type RhFactor = "+" | "-";
export type BloodGroup = `${BloodType}${RhFactor}`;

const COMPATIBILITY_MATRIX: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/**
 * Format blood type and Rh factor into a unified standard string (e.g., B+).
 */
export function formatBloodGroup(type: BloodType, rh: RhFactor): BloodGroup {
  return `${type}${rh}`;
}

/**
 * Returns the complete donor compatibility matrix.
 * Key: Donor Blood Group, Value: List of Recipient Blood Groups they can donate to.
 */
export function getCompatibilityMatrix(): Record<BloodGroup, BloodGroup[]> {
  return COMPATIBILITY_MATRIX;
}

/**
 * Checks if a specific donor group is compatible with a recipient group.
 */
export function isCompatible(donor: string, recipient: string): boolean {
  const donorGroup = donor as BloodGroup;
  const recipientGroup = recipient as BloodGroup;

  const compatibleRecipients = COMPATIBILITY_MATRIX[donorGroup];
  if (!compatibleRecipients) return false;

  return compatibleRecipients.includes(recipientGroup);
}

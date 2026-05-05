// Helper to estimate total price from EditOrderModal selections.
// EditOrderModal uses human-readable labels; pricing.ts uses internal keys.

import { calculatePricingBreakdown } from "@/lib/pricing";

export const mapVehicleLabelToKey = (label: string): string => {
  switch (label) {
    case "Sedan":
      return "sedan";
    case "MPV":
      return "mpv";
    case "Pickup/SUV":
    case "SUV / Pickup":
      return "pickup_suv";
    case "Motorcycle":
      return "motorcycle";
    default:
      return label.toLowerCase();
  }
};

/**
 * Given the package labels selected in the EditOrderModal, derive the
 * pricing.ts package key.  Precedence: Voluntary Plus > Voluntary > Compulsory.
 */
export const derivePackageTypeKey = (packages: string[]): string => {
  const hasVoluntaryPlus = packages.some((p) => /voluntary\+|voluntary plus/i.test(p));
  if (hasVoluntaryPlus) return "compulsory_voluntary_plus";
  const hasVoluntary = packages.some((p) => /voluntary/i.test(p));
  if (hasVoluntary) return "compulsory_voluntary";
  return "compulsory";
};

export interface EstimateInput {
  vehicleType: string;
  packages: string[];
  passengers?: number;
  durationDays: number;
}

export const estimateOrderPrice = ({
  vehicleType,
  packages,
  passengers = 1,
  durationDays,
}: EstimateInput): { totalPrice: number; isValid: boolean; error?: string } => {
  if (!vehicleType || packages.length === 0) {
    return { totalPrice: 0, isValid: false };
  }
  const vehicleKey = mapVehicleLabelToKey(vehicleType);
  const packageKey = derivePackageTypeKey(packages);
  const result = calculatePricingBreakdown(
    packageKey,
    vehicleKey,
    passengers,
    [],
    durationDays,
  );
  return {
    totalPrice: result.totalPrice,
    isValid: result.isValid,
    error: result.validationError,
  };
};

// Centralized pricing logic for ThaiDriveSecure
// Prices sourced from the official insurance plan (May 2026)

export interface PricingBreakdownItem {
  label: string;
  description?: string;
  amount: number;
}

export interface PricingResult {
  items: PricingBreakdownItem[];
  totalPrice: number;
  isValid: boolean;
  validationError?: string;
}

// -----------------------------------------------------------------------
// Duration tiers in days → matches the plan's labeling
// -----------------------------------------------------------------------
// Plan label   : 9 Days | 19 Days | 1 Month | 3 Months | 6 Months | 1 Year
// Stored as days:  9    |   19    |   30    |    90    |   180    |  365
// -----------------------------------------------------------------------

export const DURATION_TIERS = [9, 19, 30, 90, 180, 365] as const;
export type DurationTier = (typeof DURATION_TIERS)[number];

export const DURATION_TIER_LABELS: Record<DurationTier, string> = {
  9:   "9 Days",
  19:  "19 Days",
  30:  "1 Month",
  90:  "3 Months",
  180: "6 Months",
  365: "1 Year",
};

// -----------------------------------------------------------------------
// Package pricing tables  [vehicleType][durationTier] → price (RM)
// -----------------------------------------------------------------------

type PriceTable = Record<string, Record<number, number>>;

/** Compulsory only */
const COMPULSORY_PRICES: PriceTable = {
  sedan:      { 9: 35,  19: 50,  30: 65,  90: 120, 180: 200, 365: 350 },
  pickup_suv: { 9: 45,  19: 60,  30: 80,  90: 140, 180: 230, 365: 400 },
  mpv:        { 9: 50,  19: 70,  30: 90,  90: 160, 180: 260, 365: 450 },
  motorcycle: { 9: 20,  19: 30,  30: 40,  90: 70,  180: 120, 365: 200 },
};

/** Compulsory + Voluntary */
const COMPULSORY_VOLUNTARY_PRICES: PriceTable = {
  sedan:      { 9: 60,  19: 80,  30: 100, 90: 180, 180: 300, 365: 500 },
  pickup_suv: { 9: 75,  19: 95,  30: 120, 90: 210, 180: 340, 365: 580 },
  mpv:        { 9: 85,  19: 110, 30: 140, 90: 240, 180: 380, 365: 650 },
  motorcycle: { 9: 35,  19: 50,  30: 65,  90: 110, 180: 180, 365: 300 },
};

/** Compulsory + Voluntary Plus */
const COMPULSORY_VOLUNTARY_PLUS_PRICES: PriceTable = {
  sedan:      { 9: 85,  19: 110, 30: 135, 90: 240, 180: 400, 365: 650 },
  pickup_suv: { 9: 100, 19: 130, 30: 160, 90: 280, 180: 450, 365: 750 },
  mpv:        { 9: 110, 19: 150, 30: 180, 90: 320, 180: 500, 365: 850 },
  motorcycle: { 9: 50,  19: 70,  30: 90,  90: 150, 180: 240, 365: 400 },
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

export const vehicleTypeLabels: Record<string, string> = {
  sedan:      "Sedan (5 Seater)",
  mpv:        "MPV (7 Seater)",
  pickup_suv: "SUV (5 Seater)",
  motorcycle: "Motorcycle (2 Seater)",
};

export const packageTypeLabels: Record<string, string> = {
  compulsory:               "Insurance Compulsory",
  compulsory_voluntary:     "Insurance Compulsory + Voluntary",
  compulsory_voluntary_plus: "Insurance Compulsory + Voluntary Plus",
};

/**
 * Resolve the closest duration tier (rounds up to the next tier).
 * Returns null if the requested days exceed the highest tier.
 */
export const resolveDurationTier = (days: number): DurationTier | null => {
  for (const tier of DURATION_TIERS) {
    if (days <= tier) return tier;
  }
  return null; // exceeds 1 year – not supported
};

/**
 * Get the base package price for a given package type, vehicle type, and
 * duration (in days). Returns 0 if the combination is not found.
 */
export const getPackageBasePrice = (
  packageType: string,
  vehicleType: string,
  durationDays: number = 9
): number => {
  const tier = resolveDurationTier(durationDays);
  if (!tier) return 0;

  const table =
    packageType === "compulsory_voluntary_plus"
      ? COMPULSORY_VOLUNTARY_PLUS_PRICES
      : packageType === "compulsory_voluntary"
      ? COMPULSORY_VOLUNTARY_PRICES
      : COMPULSORY_PRICES;

  return table[vehicleType]?.[tier] ?? 0;
};

/**
 * Calculate complete pricing breakdown.
 */
export const calculatePricingBreakdown = (
  packageType: string,
  vehicleType: string,
  _passengerCount: number = 1,
  _addons: string[] = [],
  durationDays: number = 9
): PricingResult => {
  if (!vehicleType || !packageType) {
    return { items: [], totalPrice: 0, isValid: false, validationError: "Select vehicle and package" };
  }

  const tier = resolveDurationTier(durationDays);
  if (!tier) {
    return {
      items: [],
      totalPrice: 0,
      isValid: false,
      validationError: "Duration exceeds maximum of 1 year",
    };
  }

  const packagePrice = getPackageBasePrice(packageType, vehicleType, durationDays);
  if (packagePrice === 0) {
    return {
      items: [],
      totalPrice: 0,
      isValid: false,
      validationError: "Invalid vehicle or package type",
    };
  }

  const vehicleLabel  = vehicleTypeLabels[vehicleType]  || vehicleType;
  const packageLabel  = packageTypeLabels[packageType]  || packageType;
  const durationLabel = DURATION_TIER_LABELS[tier];

  const items: PricingBreakdownItem[] = [
    {
      label: `${packageLabel} (${vehicleLabel})`,
      description: durationLabel,
      amount: packagePrice,
    },
  ];

  return { items, totalPrice: packagePrice, isValid: true };
};

/**
 * Format price in RM currency.
 */
export const formatPrice = (amount: number): string => {
  return `RM ${amount.toFixed(2)}`;
};

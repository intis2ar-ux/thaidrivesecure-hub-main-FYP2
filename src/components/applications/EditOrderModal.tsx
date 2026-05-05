import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Application } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { estimateOrderPrice } from "@/lib/applicationPricing";
import { formatPrice, resolveDurationTier } from "@/lib/pricing";

export interface EditOrderFormValues {
  name: string;
  phone: string;
  vehicleType: string;
  where: string;
  travel: {
    departDate?: Date;
    days: number;
  };
  packages: string[];
}

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSave: (values: EditOrderFormValues) => Promise<void>;
}

const VEHICLE_OPTIONS = [
  { value: "Sedan", label: "Sedan" },
  { value: "MPV", label: "MPV" },
  { value: "Pickup/SUV", label: "Pickup/SUV" },
  { value: "Motorcycle", label: "Motorcycle" },
];

const BORDER_OPTIONS = [
  "Padang Besar → Sadao",
  "Bukit Kayu Hitam → Sadao (Danok)",
  "Rantau Panjang → Sungai Kolok",
  "Wang Kelian → Wang Prachan",
];

const PACKAGE_OPTIONS = [
  "Insurance Compulsory",
  "Insurance Compulsory + Voluntary",
  "Insurance Compulsory + Voluntary Plus",
];

// Duration tiers in days that match the official insurance plan pricing table
const DURATION_OPTIONS = [
  { days: 9,   label: "9 days" },
  { days: 19,  label: "19 days" },
  { days: 30,  label: "1 month" },
  { days: 90,  label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];

export const EditOrderModal = ({
  open,
  onOpenChange,
  application,
  onSave,
}: EditOrderModalProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [where, setWhere] = useState("");
  const [departDate, setDepartDate] = useState<Date | undefined>(undefined);
  const [days, setDays] = useState<number>(9);
  const [packages, setPackages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Build border route options: always include the stored value so the field is never blank
  const borderOptions = useMemo(() => {
    const stored = application?.where;
    if (stored && !BORDER_OPTIONS.includes(stored)) {
      return [...BORDER_OPTIONS, stored];
    }
    return BORDER_OPTIONS;
  }, [application?.where]);

  useEffect(() => {
    if (!application || !open) return;
    setName(application.name || "");
    setPhone(application.phone || "");
    setVehicleType(application.vehicleType || "");
    setWhere(application.where || "");
    setDepartDate(application.travel?.departDate);
    // Snap stored days to the nearest plan tier so the duration field is never blank
    const storedDays = application.travel?.days ?? 9;
    setDays(resolveDurationTier(storedDays) ?? 9);
    setPackages(application.packages || []);
    setPhoneError(null);
    setNameError(null);
  }, [application, open]);

  const isMotorcycle = vehicleType === "Motorcycle";

  const togglePackage = (pkg: string) => {
    setPackages((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg],
    );
  };

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError("Customer name is required");
      valid = false;
    } else {
      setNameError(null);
    }
    if (!phone.trim() || !/^\d+$/.test(phone.trim())) {
      setPhoneError("Phone must contain digits only");
      valid = false;
    } else {
      setPhoneError(null);
    }
    return valid;
  };

  const priceEstimate = useMemo(
    () =>
      estimateOrderPrice({
        vehicleType,
        packages,
        passengers: application?.passengers ?? 1,
        durationDays: days,
      }),
    [vehicleType, packages, days, application?.passengers],
  );

  const originalPrice = application?.totalPrice ?? 0;
  const priceChanged =
    priceEstimate.isValid && Math.abs(priceEstimate.totalPrice - originalPrice) > 0.01;

  const isValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      /^\d+$/.test(phone.trim()) &&
      vehicleType.length > 0 &&
      where.length > 0 &&
      packages.length > 0 &&
      days > 0
    );
  }, [name, phone, vehicleType, where, packages, days]);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        vehicleType,
        where,
        travel: { departDate, days },
        packages,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            {application?.orderId ? `Order ${application.orderId}` : "Update order details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Customer Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={100}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input
              id="edit-phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="0123456789"
              maxLength={20}
            />
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          </div>

          {/* Vehicle Type */}
          <div className="space-y-1.5">
            <Label>Vehicle Type</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Border Route */}
          <div className="space-y-1.5">
            <Label>Border Route</Label>
            <Select value={where} onValueChange={setWhere}>
              <SelectTrigger>
                <SelectValue placeholder="Select border route" />
              </SelectTrigger>
              <SelectContent>
                {borderOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Travel Day: Date + Duration */}
          <div className="space-y-1.5">
            <Label>Travel Day</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start font-normal",
                      !departDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departDate ? format(departDate, "dd MMM yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={departDate}
                    onSelect={setDepartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={String(days)}
                onValueChange={(v) => setDays(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.days} value={String(opt.days)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isMotorcycle && days < 90 && (
              <p className="text-xs text-warning">
                Motorcycle insurance typically requires a minimum of 90 days.
              </p>
            )}
          </div>

          {/* Packages */}
          <div className="space-y-2">
            <Label>Packages</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              {PACKAGE_OPTIONS.map((pkg) => (
                <label
                  key={pkg}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={packages.includes(pkg)}
                    onCheckedChange={() => togglePackage(pkg)}
                  />
                  <span>{pkg}</span>
                </label>
              ))}
            </div>
            {packages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Select at least one package.
              </p>
            )}
          </div>

          {/* Price Preview */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Total</span>
              <span className="font-medium text-foreground">
                {formatPrice(originalPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1.5">
              <span className="text-muted-foreground">New Estimated Total</span>
              {priceEstimate.isValid ? (
                <span
                  className={cn(
                    "font-semibold",
                    priceChanged ? "text-accent" : "text-foreground",
                  )}
                >
                  {formatPrice(priceEstimate.totalPrice)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  {priceEstimate.error || "Select vehicle & package"}
                </span>
              )}
            </div>
            {priceChanged && (
              <p className="text-xs text-accent mt-2">
                Price will change by{" "}
                {formatPrice(Math.abs(priceEstimate.totalPrice - originalPrice))}{" "}
                ({priceEstimate.totalPrice > originalPrice ? "increase" : "decrease"}).
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

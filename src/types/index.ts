export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin: Date;
  avatar?: string;
}

export type ApplicationStatus =
  | "applied"
  | "pending"
  | "approved"
  | "processing"
  | "document_generated"
  | "completed"
  | "rejected";

export interface Application {
  id: string;
  // Firestore fields - mapped from orders collection
  orderId: string;
  name: string;
  email?: string;
  phone: string;
  vehicleType: string;
  where: string;
  when: string;
  travel?: {
    departDate?: Date;
    returnDate?: Date;
    duration?: string;
    days?: number;
  };
  packages: string[];
  passengers: number;
  totalPrice: number;
  status: ApplicationStatus;
  deliveryMethod: string;
  userId?: string;
  createdAt: Date;
  receiptUrl?: string;
  packageType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  documents?: {
    passportUrls?: string[];
    vehicleGrantUrl?: string;
  };
  ocrScore?: number;
  insuranceDocumentUrl?: string;
  statusUpdatedAt?: Date;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
  expectedValue?: string;
  isMismatch?: boolean;
  ocrRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type RejectionReason = "blurred" | "mismatch" | "expired" | "unclear" | "incomplete" | "fraudulent";

export interface VerificationAudit {
  id: string;
  reviewerName: string;
  reviewerId: string;
  action: "approved" | "rejected" | "flagged" | "re_upload_requested";
  reason?: RejectionReason;
  notes?: string;
  timestamp: Date;
}

export interface AIVerification {
  id: string;
  applicationId: string;
  documentType: "drivers_license" | "passport" | "vehicle_registration";
  documentId: string;
  extractedFields: ExtractedField[];
  overallConfidence: number;
  verifiedByAI: boolean;
  reviewedByStaff: boolean;
  flagged: boolean;
  timestamp: Date;
  documentImageUrl?: string;
  rejectionReason?: RejectionReason;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  auditTrail?: VerificationAudit[];
  reUploadRequested?: boolean;
}

export type PaymentMethod = "qr" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentVerificationStatus = "pending_verification" | "verified" | "rejected" | "updated";

export interface PaymentVerificationLog {
  action: PaymentVerificationStatus;
  performedBy: string;
  notes?: string;
  timestamp: Date;
}

export interface Payment {
  id: string;
  applicationId: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  verificationStatus: PaymentVerificationStatus;
  receiptUrl?: string;
  createdAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  verificationHistory?: PaymentVerificationLog[];
}

export type AddonType = "tdac" | "insurance" | "towing" | "sim_card";
export type AddonStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Addon {
  id: string;
  applicationId: string;
  type: AddonType;
  vendorName: string;
  cost: number;
  status: AddonStatus;
  trackingNumber?: string;
  createdAt?: Date;
}


export interface Analytics {
  newUsersToday: number;
  activeUsers: number;
  totalPayments: number;
  totalRevenue: number;
  avgVerificationTime: number;
  popularAddonType: AddonType;
}

export interface Report {
  id: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  startDate: Date;
  endDate: Date;
  totalUsers: number;
  totalApplications: number;
  totalVerified: number;
  totalRejected: number;
  totalRevenue: number;
  downloadUrl: string;
  createdAt: Date;
}


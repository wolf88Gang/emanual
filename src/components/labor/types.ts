export type ValidationStatus = 'pending' | 'approved' | 'adjusted' | 'rejected' | 'paid';
export type DecisionType = 'approval' | 'adjustment' | 'rejection';
export type RateType = 'hourly' | 'daily' | 'task';
export type Currency = 'USD' | 'CRC';
export type PaymentMethod = 'transfer' | 'cash' | 'check' | 'other';

export interface WorkerShift {
  id: string;
  user_id: string;
  estate_id: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_in_photo_url: string | null;
  check_out_photo_url: string | null;
  notes: string | null;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  validation?: ShiftValidation;
  payment?: ShiftPayment;
}

export interface ShiftValidation {
  id: string;
  shift_id: string;
  status: ValidationStatus;
  decision_type: DecisionType | null;
  adjusted_minutes: number | null;
  original_minutes: number | null;
  decision_message: string | null;
  ai_generated_message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer?: {
    full_name: string | null;
    email: string;
  };
}

export interface ShiftPayment {
  id: string;
  shift_id: string;
  validation_id: string | null;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  paid_by: string | null;
}

export interface WorkerRate {
  id: string;
  estate_id: string;
  user_id: string | null;
  currency: Currency;
  rate_type: RateType;
  rate_amount: number;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
}

export interface WorkerSummary {
  userId: string;
  userName: string;
  email: string;
  avatarUrl: string | null;
  shifts: WorkerShift[];
  totalMinutes: number;
  approvedMinutes: number;
  pendingMinutes: number;
  rejectedMinutes: number;
  paidMinutes: number;
  totalShifts: number;
  pendingShifts: number;
  approvedShifts: number;
  paidShifts: number;
}

export interface PerformanceMetrics {
  punctualityScore: number; // 0-100
  completionRate: number; // 0-100
  adjustmentFrequency: number; // percentage of shifts adjusted
  averageShiftDuration: number; // minutes
  consistencyScore: number; // 0-100
}

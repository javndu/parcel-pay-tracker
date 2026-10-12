export interface DriverProfile {
  id: string;
  full_name: string;
  vehicle_type: string;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  date: string;
  normal: number;
  express: number;
  transfer_type: string | null;
  transfer_qty: number;
  transferred_from: string | null;
  is_saturday: boolean;
  start_time: string | null;
  end_time: string | null;
  hours_worked: number | null;
  break_deducted: boolean;
  delivery_login: string | null;
  paid: boolean;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  normal_rate: number;
  express_rate: number;
  saturday_hourly_rate: number;
  theme: string;
  updated_at: string;
}

export interface EntryInput {
  date: string;
  normal: number;
  express: number;
  transfer_type: string | null;
  transfer_qty: number;
  transferred_from: string | null;
  is_saturday: boolean;
  start_time: string | null;
  end_time: string | null;
  hours_worked: number | null;
  break_deducted: boolean;
  delivery_login: string | null;
  is_paid?: boolean;
}

export type TabId = 'entry' | 'history' | 'pay';

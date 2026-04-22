export interface ItemCreate {
  name: string;
  price: number | null;
  amount: number;
  unit: string | null;
}

export interface ReceiptUpdate {
  store?: string | null;
  date?: string | null;
  payment_method?: string | null;
  total?: number | null;
  currency?: string;
  notes?: string | null;
  items?: ItemCreate[];
}

export interface Item {
  id: number;
  receipt_id: number;
  name: string;
  price: number | null;
  amount: number;
  unit: string | null;
}

export interface Receipt {
  id: number;
  store: string | null;
  date: string | null;
  payment_method: string | null;
  total: number | null;
  currency: string;
  notes: string | null;
  needs_review: boolean;
  file_path: string | null;
  thumbnail_path: string | null;
  created_at: string;
  items: Item[];
}

export interface ReceiptSummary {
  id: number;
  store: string | null;
  date: string | null;
  total: number | null;
  currency: string;
  item_count: number;
  created_at: string;
}

export interface MonthlyStats {
  year: number;
  month: number;
  total: number;
  receipt_count: number;
  avg_per_receipt: number;
}

export interface StoreStats {
  store: string;
  total: number;
  visit_count: number;
}

export interface DashboardStats {
  total_receipts: number;
  total_spent: number;
  avg_per_receipt: number;
  monthly: MonthlyStats[];
  by_store: StoreStats[];
}

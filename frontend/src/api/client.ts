import type { Receipt, ReceiptSummary, DashboardStats } from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  receipts: {
    list: (params?: {
      store?: string;
      date_from?: string;
      date_to?: string;
      skip?: number;
      limit?: number;
    }) => {
      const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [
        string,
        string,
      ][];
      const qs = entries.length ? "?" + new URLSearchParams(entries).toString() : "";
      return request<ReceiptSummary[]>(`/receipts${qs}`);
    },
    get: (id: number) => request<Receipt>(`/receipts/${id}`),
    upload: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return request<Receipt>("/receipts", { method: "POST", body });
    },
    reanalyze: (id: number) =>
      request<Receipt>(`/receipts/${id}/reanalyze`, { method: "POST" }),
    update: (id: number, data: Partial<Receipt>) =>
      request<Receipt>(`/receipts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/receipts/${id}`, { method: "DELETE" }),
  },
  stats: {
    dashboard: () => request<DashboardStats>("/stats/dashboard"),
  },
};

import type { Receipt, ReceiptSummary, ReceiptUpdate, DashboardStats } from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let detail = `HTTP ${response.status}`;
    try {
      const err = JSON.parse(text);
      detail = err.detail ?? detail;
    } catch {
      if (response.status === 502 || response.status === 503) detail = "Backend nicht erreichbar";
      else if (response.status === 504) detail = "Anfrage Timeout (Ollama zu langsam?)";
      else if (text) detail = text.slice(0, 120);
    }
    throw new Error(detail);
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
    update: (id: number, data: ReceiptUpdate) =>
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

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, RefreshCw, AlertCircle, Pencil, X, Check, Plus } from "lucide-react";
import { api } from "../api/client";
import { fmtDate, fmtCurrency } from "../utils/format";
import type { Receipt } from "../types";

interface EditForm {
  store: string;
  date: string;
  payment_method: string;
  total: string;
  currency: string;
  items: Array<{ name: string; price: string; amount: string; unit: string }>;
}

function initForm(r: Receipt): EditForm {
  return {
    store: r.store ?? "",
    date: r.date ?? "",
    payment_method: r.payment_method ?? "",
    total: r.total?.toString() ?? "",
    currency: r.currency,
    items: r.items.map((i) => ({
      name: i.name,
      price: i.price?.toString() ?? "",
      amount: i.amount.toString(),
      unit: i.unit ?? "",
    })),
  };
}

function Field({
  label,
  value,
  editing,
  children,
}: {
  label: string;
  value: string;
  editing: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <dt className="text-sm text-gray-400 dark:text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-100 text-right">
        {editing ? children : value || "—"}
      </dd>
    </div>
  );
}

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ["receipts", Number(id)],
    queryFn: () => api.receipts.get(Number(id)),
    enabled: !!id,
  });

  const reanalyze = useMutation({
    mutationFn: () => api.receipts.reanalyze(Number(id)),
    onSuccess: (updated: Receipt) => {
      qc.setQueryData(["receipts", Number(id)], updated);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const update = useMutation({
    mutationFn: (f: EditForm) =>
      api.receipts.update(Number(id), {
        store: f.store || undefined,
        date: f.date ? (f.date as unknown as null) : undefined,
        payment_method: f.payment_method || undefined,
        total: f.total ? parseFloat(f.total) : undefined,
        currency: f.currency,
        items: f.items
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name,
            price: i.price ? parseFloat(i.price) : null,
            amount: parseFloat(i.amount) || 1,
            unit: i.unit || null,
          })),
      }),
    onSuccess: (updated: Receipt) => {
      qc.setQueryData(["receipts", Number(id)], updated);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setEditing(false);
    },
  });

  function startEdit() {
    if (receipt) {
      setForm(initForm(receipt));
      setEditing(true);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setForm(null);
  }

  function setField<K extends keyof EditForm>(key: K, val: EditForm[K]) {
    setForm((f) => f && { ...f, [key]: val });
  }

  function setItem(idx: number, key: string, val: string) {
    setForm((f) =>
      f
        ? { ...f, items: f.items.map((item, i) => (i === idx ? { ...item, [key]: val } : item)) }
        : f
    );
  }

  function addItem() {
    setForm((f) =>
      f ? { ...f, items: [...f.items, { name: "", price: "", amount: "1", unit: "" }] } : f
    );
  }

  function removeItem(idx: number) {
    setForm((f) => f ? { ...f, items: f.items.filter((_, i) => i !== idx) } : f);
  }

  async function handleDelete() {
    if (!confirm("Beleg wirklich löschen?")) return;
    setDeleting(true);
    try {
      await api.receipts.delete(Number(id));
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/receipts");
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) return <p className="text-gray-500">Lade...</p>;
  if (error) return <p className="text-red-500">Fehler beim Laden.</p>;
  if (!receipt) return null;

  const thumbnailUrl = receipt.thumbnail_path ? `/uploads/${receipt.thumbnail_path}` : null;
  const originalUrl = receipt.file_path ? `/uploads/${receipt.file_path}` : null;

  const inputCls =
    "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-right";
  const editInputCls =
    "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300";
  const btnOutline =
    "flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link to="/receipts" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Alle Belege</span>
        </Link>

        <div className="flex gap-2 flex-wrap">
          {!editing ? (
            <>
              <button onClick={startEdit} className={btnOutline}>
                <Pencil size={14} />
                Bearbeiten
              </button>
              <button onClick={() => reanalyze.mutate()} disabled={reanalyze.isPending} className={btnOutline}>
                <RefreshCw size={14} className={reanalyze.isPending ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{reanalyze.isPending ? "Analysiere..." : "Neu analysieren"}</span>
                <span className="sm:hidden">Analyse</span>
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50">
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => form && update.mutate(form)} disabled={update.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Check size={14} />
                {update.isPending ? "Speichere..." : "Speichern"}
              </button>
              <button onClick={cancelEdit} className={btnOutline}>
                <X size={14} />
                Abbrechen
              </button>
            </>
          )}
        </div>
      </div>

      {reanalyze.error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />{(reanalyze.error as Error).message}
        </div>
      )}
      {update.error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />{(update.error as Error).message}
        </div>
      )}
      {receipt.notes && !editing && (
        <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Analysehinweis: {receipt.notes}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Belegdetails</h2>
          <dl>
            <Field label="Geschäft" value={receipt.store ?? ""} editing={editing}>
              <input className={inputCls} value={form?.store ?? ""} onChange={(e) => setField("store", e.target.value)} />
            </Field>
            <Field label="Datum" value={fmtDate(receipt.date)} editing={editing}>
              <input type="date" className={inputCls} value={form?.date ?? ""} onChange={(e) => setField("date", e.target.value)} />
            </Field>
            <Field label="Zahlungsmethode" value={receipt.payment_method ?? ""} editing={editing}>
              <input className={inputCls} value={form?.payment_method ?? ""} onChange={(e) => setField("payment_method", e.target.value)} />
            </Field>
            <Field label="Summe" value={fmtCurrency(receipt.total, receipt.currency)} editing={editing}>
              <input type="number" step="0.01" className={inputCls} value={form?.total ?? ""} onChange={(e) => setField("total", e.target.value)} />
            </Field>
            <Field label="Währung" value={receipt.currency} editing={editing}>
              <input className={`${inputCls} w-20`} value={form?.currency ?? ""} onChange={(e) => setField("currency", e.target.value)} />
            </Field>
            <Field label="Hochgeladen" value={new Date(receipt.created_at).toLocaleString("de-AT")} editing={false} />
          </dl>
          {originalUrl && !editing && (
            <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-3 block">
              Originaldatei anzeigen
            </a>
          )}
        </div>

        {thumbnailUrl && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
            <img src={thumbnailUrl} alt="Beleg" className="w-full object-contain max-h-72 sm:max-h-80" />
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">
            Artikel {editing ? `(${form?.items.length ?? 0})` : `(${receipt.items.length})`}
          </h2>
          {editing && (
            <button onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800">
              <Plus size={15} />Hinzufügen
            </button>
          )}
        </div>

        {editing && form ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">Artikel</th>
                  <th className="text-center px-2 py-2.5 font-medium text-gray-500 dark:text-gray-400 w-20">Menge</th>
                  <th className="text-center px-2 py-2.5 font-medium text-gray-500 dark:text-gray-400 w-16">Einheit</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400 w-24">Preis</th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="px-4 py-2">
                      <input className={editInputCls} value={item.name} placeholder="Artikelname" onChange={(e) => setItem(idx, "name", e.target.value)} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" step="0.001" className={`${editInputCls} text-center`} value={item.amount} onChange={(e) => setItem(idx, "amount", e.target.value)} />
                    </td>
                    <td className="px-2 py-2">
                      <input className={`${editInputCls} text-center`} value={item.unit} placeholder="kg" onChange={(e) => setItem(idx, "unit", e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" className={`${editInputCls} text-right`} value={item.price} placeholder="0.00" onChange={(e) => setItem(idx, "price", e.target.value)} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeItem(idx)} className="text-gray-300 dark:text-gray-600 hover:text-red-500">
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {form.items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">Noch keine Artikel. Klicke "Hinzufügen".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : receipt.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium text-gray-500 dark:text-gray-400">Artikel</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400">Menge</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 dark:text-gray-400">Preis</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400">
                      {item.amount}{item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-800 dark:text-gray-100">
                      {fmtCurrency(item.price, receipt.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <tr>
                  <td colSpan={2} className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-200">Gesamt</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-800 dark:text-gray-100">
                    {fmtCurrency(receipt.total, receipt.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">Keine Artikel erkannt.</p>
        )}
      </div>
    </div>
  );
}

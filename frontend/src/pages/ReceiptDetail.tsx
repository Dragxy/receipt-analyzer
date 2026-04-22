import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../api/client";
import type { Receipt } from "../types";

function fmt(amount: number | null, currency = "EUR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(amount);
}

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link to="/receipts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} />
          Alle Belege
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => reanalyze.mutate()}
            disabled={reanalyze.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={reanalyze.isPending ? "animate-spin" : ""} />
            {reanalyze.isPending ? "Analysiere..." : "Neu analysieren"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Löschen
          </button>
        </div>
      </div>

      {reanalyze.error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />
          {(reanalyze.error as Error).message}
        </div>
      )}

      {receipt.notes && (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>Analysehinweis: {receipt.notes}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Belegdetails</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Geschäft", receipt.store ?? "—"],
              ["Datum", receipt.date ?? "—"],
              ["Zahlungsmethode", receipt.payment_method ?? "—"],
              ["Summe", fmt(receipt.total, receipt.currency)],
              ["Währung", receipt.currency],
              ["Hochgeladen", new Date(receipt.created_at).toLocaleString("de-AT")],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-800 text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {originalUrl && (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline block"
            >
              Originaldatei anzeigen
            </a>
          )}
        </div>

        {thumbnailUrl && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <img
              src={thumbnailUrl}
              alt="Beleg"
              className="w-full object-contain max-h-80"
            />
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">
            Artikel ({receipt.items.length})
          </h2>
        </div>
        {receipt.items.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">Artikel</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-500">Menge</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500">Preis</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{item.name}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500">
                    {item.amount}{item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-800">
                    {fmt(item.price, receipt.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-5 py-3 font-semibold text-gray-700">Gesamt</td>
                <td className="px-5 py-3 text-right font-bold text-gray-800">
                  {fmt(receipt.total, receipt.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">Keine Artikel erkannt.</p>
        )}
      </div>
    </div>
  );
}

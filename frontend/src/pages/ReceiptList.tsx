import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { api } from "../api/client";

function fmt(amount: number | null, currency = "EUR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(amount);
}

export default function ReceiptList() {
  const [store, setStore] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["receipts", { store, dateFrom, dateTo, page }],
    queryFn: () =>
      api.receipts.list({
        store: store || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        skip: page * limit,
        limit,
      }),
  });

  function reset() {
    setStore("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Belege</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-500 mb-1 block">Geschäft</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Suchen..."
              value={store}
              onChange={(e) => { setStore(e.target.value); setPage(0); }}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Von</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Bis</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          />
        </div>
        <button
          onClick={reset}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Zurücksetzen
        </button>
      </div>

      {isLoading && <p className="text-gray-500">Lade...</p>}
      {error && <p className="text-red-500">Fehler beim Laden.</p>}

      {data && data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>Keine Belege gefunden.</p>
          <Link to="/upload" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
            Jetzt einen hochladen
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Geschäft</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Zahlungsmethode</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Artikel</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Summe</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.store ?? "Unbekannt"}</td>
                    <td className="px-4 py-3 text-gray-500">{r.date ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">—</td>
                    <td className="px-4 py-3 text-gray-500">{r.item_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {fmt(r.total, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/receipts/${r.id}`}>
                        <ChevronRight size={16} className="text-gray-400 hover:text-gray-700" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-500">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Zurück
            </button>
            <span>Seite {page + 1}</span>
            <button
              disabled={data.length < limit}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Weiter
            </button>
          </div>
        </>
      )}
    </div>
  );
}

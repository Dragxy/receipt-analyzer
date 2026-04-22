import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight, SlidersHorizontal } from "lucide-react";
import { api } from "../api/client";

function fmt(amount: number | null, currency = "EUR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(amount);
}

export default function ReceiptList() {
  const [store, setStore] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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

  const hasFilters = store || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Belege</h1>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
            hasFilters
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filter {hasFilters ? "aktiv" : ""}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Geschäft suchen..."
            value={store}
            onChange={(e) => { setStore(e.target.value); setPage(0); }}
          />
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-gray-500 mb-1 block">Von</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-gray-500 mb-1 block">Bis</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              />
            </div>
            {hasFilters && (
              <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 underline whitespace-nowrap">
                Zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading && <p className="text-gray-500 text-sm">Lade...</p>}
      {error && <p className="text-red-500 text-sm">Fehler beim Laden.</p>}

      {data && data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-1">Keine Belege gefunden.</p>
          <Link to="/upload" className="text-blue-600 hover:underline text-sm">
            Jetzt einen hochladen
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {data.map((r) => (
              <Link
                key={r.id}
                to={`/receipts/${r.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{r.store ?? "Unbekannt"}</p>
                  <p className="text-sm text-gray-400">{r.date ?? "—"} · {r.item_count} Artikel</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="font-semibold text-gray-800">{fmt(r.total, r.currency)}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Geschäft</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Zahlungsmethode</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Artikel</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Summe</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.store ?? "Unbekannt"}</td>
                    <td className="px-4 py-3 text-gray-500">{r.date ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">—</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.item_count}</td>
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

          {/* Pagination */}
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

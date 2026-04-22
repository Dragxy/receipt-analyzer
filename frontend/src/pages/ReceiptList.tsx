import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight, SlidersHorizontal } from "lucide-react";
import { api } from "../api/client";
import { fmtDate, fmtCurrency } from "../utils/format";

const inputCls = "px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300";

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

  function reset() { setStore(""); setDateFrom(""); setDateTo(""); setPage(0); }
  const hasFilters = store || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Belege</h1>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
            hasFilters
              ? "border-blue-300 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filter {hasFilters ? "aktiv" : ""}
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className={`pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300`}
            placeholder="Geschäft suchen..."
            value={store}
            onChange={(e) => { setStore(e.target.value); setPage(0); }}
          />
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Von</label>
              <input type="date" className={inputCls} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Bis</label>
              <input type="date" className={inputCls} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
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
          <Link to="/upload" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Jetzt einen hochladen</Link>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {data.map((r) => (
              <Link key={r.id} to={`/receipts/${r.id}`} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{r.store ?? "Unbekannt"}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">{fmtDate(r.date)} · {r.item_count} Artikel</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{fmtCurrency(r.total, r.currency)}</span>
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Geschäft</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Datum</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Artikel</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Summe</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{r.store ?? "Unbekannt"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{r.item_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">{fmtCurrency(r.total, r.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/receipts/${r.id}`}><ChevronRight size={16} className="text-gray-400 dark:text-gray-500 hover:text-gray-700" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-500">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">Zurück</button>
            <span className="dark:text-gray-400">Seite {page + 1}</span>
            <button disabled={data.length < limit} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">Weiter</button>
          </div>
        </>
      )}
    </div>
  );
}

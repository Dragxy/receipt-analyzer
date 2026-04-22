import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ShoppingCart, Euro, Receipt, TrendingUp } from "lucide-react";
import { api } from "../api/client";
import { useDarkMode } from "../context/DarkModeContext";
import { fmtDate, fmtCurrency } from "../utils/format";

const MONTH_NAMES = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { dark } = useDarkMode();
  const tickColor = dark ? "#9ca3af" : "#6b7280";
  const gridColor = dark ? "#374151" : "#f0f0f0";
  const tooltipStyle = dark ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f3f4f6" } : {};

  const { data: stats, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: api.stats.dashboard });
  const { data: recent } = useQuery({ queryKey: ["receipts", { limit: 5 }], queryFn: () => api.receipts.list({ limit: 5 }) });

  if (isLoading) return <p className="text-gray-500">Lade...</p>;
  if (error) return <p className="text-red-500">Fehler beim Laden der Daten.</p>;
  if (!stats) return null;

  const last6Months = stats.monthly.slice(-6).map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    total: m.total,
  }));

  const thisMonth = stats.monthly[stats.monthly.length - 1];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gesamt ausgegeben" value={fmtCurrency(stats.total_spent)} icon={Euro} color="bg-blue-500" />
        <StatCard label="Anzahl Belege" value={String(stats.total_receipts)} icon={Receipt} color="bg-violet-500" />
        <StatCard label="Durchschnitt" value={fmtCurrency(stats.avg_per_receipt)} icon={TrendingUp} color="bg-emerald-500" />
        <StatCard label="Dieser Monat" value={thisMonth ? fmtCurrency(thisMonth.total) : "—"} icon={ShoppingCart} color="bg-orange-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Ausgaben letzte 6 Monate</h2>
          {last6Months.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} />
                <YAxis tick={{ fontSize: 12, fill: tickColor }} tickFormatter={(v) => `${v} €`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Noch keine Daten</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Top Geschäfte</h2>
          {stats.by_store.length > 0 ? (
            <ul className="space-y-2">
              {stats.by_store.slice(0, 5).map((s) => (
                <li key={s.store} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{s.store}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{fmtCurrency(s.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Noch keine Daten</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Letzte Belege</h2>
          <Link to="/receipts" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Alle anzeigen</Link>
        </div>
        {recent && recent.length > 0 ? (
          <div>
            {/* Mobile */}
            <div className="sm:hidden space-y-0">
              {recent.map((r) => (
                <Link key={r.id} to={`/receipts/${r.id}`} className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{r.store ?? "Unbekannt"}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(r.date)}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{fmtCurrency(r.total, r.currency)}</span>
                </Link>
              ))}
            </div>
            {/* Desktop */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">Geschäft</th>
                  <th className="pb-2 font-medium">Datum</th>
                  <th className="pb-2 font-medium text-right">Summe</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2">
                      <Link to={`/receipts/${r.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {r.store ?? "Unbekannt"}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{fmtDate(r.date)}</td>
                    <td className="py-2 text-right font-medium text-gray-800 dark:text-gray-100">
                      {fmtCurrency(r.total, r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">Noch keine Belege vorhanden.</p>
        )}
      </div>
    </div>
  );
}

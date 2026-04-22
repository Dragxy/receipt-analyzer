import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ShoppingCart, Euro, Receipt, TrendingUp } from "lucide-react";
import { api } from "../api/client";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(amount);
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.stats.dashboard,
  });

  const { data: recent } = useQuery({
    queryKey: ["receipts", { limit: 5 }],
    queryFn: () => api.receipts.list({ limit: 5 }),
  });

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
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Gesamt ausgegeben"
          value={fmt(stats.total_spent)}
          icon={Euro}
          color="bg-blue-500"
        />
        <StatCard
          label="Anzahl Belege"
          value={String(stats.total_receipts)}
          icon={Receipt}
          color="bg-violet-500"
        />
        <StatCard
          label="Durchschnitt"
          value={fmt(stats.avg_per_receipt)}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <StatCard
          label="Dieser Monat"
          value={thisMonth ? fmt(thisMonth.total) : "—"}
          icon={ShoppingCart}
          color="bg-orange-500"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Ausgaben letzte 6 Monate</h2>
          {last6Months.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} €`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Noch keine Daten</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Top Geschäfte</h2>
          {stats.by_store.length > 0 ? (
            <ul className="space-y-2">
              {stats.by_store.slice(0, 5).map((s) => (
                <li key={s.store} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{s.store}</span>
                  <span className="font-medium text-gray-800">{fmt(s.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Noch keine Daten</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">Letzte Belege</h2>
          <Link to="/receipts" className="text-sm text-blue-600 hover:underline">
            Alle anzeigen
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="space-y-2 sm:space-y-0">
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {recent.map((r) => (
                <Link key={r.id} to={`/receipts/${r.id}`} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{r.store ?? "Unbekannt"}</p>
                    <p className="text-xs text-gray-400">{r.date ?? "—"}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{r.total != null ? fmt(r.total, r.currency) : "—"}</span>
                </Link>
              ))}
            </div>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Geschäft</th>
                  <th className="pb-2 font-medium">Datum</th>
                  <th className="pb-2 font-medium text-right">Summe</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2">
                      <Link to={`/receipts/${r.id}`} className="text-blue-600 hover:underline">
                        {r.store ?? "Unbekannt"}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500">{r.date ?? "—"}</td>
                    <td className="py-2 text-right font-medium">
                      {r.total != null ? fmt(r.total, r.currency) : "—"}
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

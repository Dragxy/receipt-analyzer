import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { api } from "../api/client";
import { useDarkMode } from "../context/DarkModeContext";
import { fmtCurrency } from "../utils/format";

const MONTH_NAMES = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16"];

export default function Stats() {
  const { dark } = useDarkMode();
  const tickColor = dark ? "#9ca3af" : "#6b7280";
  const gridColor = dark ? "#374151" : "#f0f0f0";
  const tooltipStyle = dark ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f3f4f6" } : {};

  const { data: stats, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: api.stats.dashboard });

  if (isLoading) return <p className="text-gray-500">Lade...</p>;
  if (error) return <p className="text-red-500">Fehler beim Laden.</p>;
  if (!stats) return null;

  const monthlyData = stats.monthly.map((m) => ({
    name: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
    total: m.total,
    count: m.receipt_count,
    avg: m.avg_per_receipt,
  }));

  const pieData = stats.by_store.map((s) => ({ name: s.store, value: s.total }));

  const card = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5";
  const heading = "font-semibold text-gray-700 dark:text-gray-200 mb-4";
  const empty = <p className="text-gray-400 text-sm text-center py-8">Noch keine Daten</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Statistiken</h1>

      <div className={card}>
        <h2 className={heading}>Monatliche Ausgaben</h2>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => `${v} €`} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Gesamt" />
            </BarChart>
          </ResponsiveContainer>
        ) : empty}
      </div>

      <div className={card}>
        <h2 className={heading}>Durchschnitt pro Beleg</h2>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => `${v} €`} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Durchschnitt" />
            </LineChart>
          </ResponsiveContainer>
        ) : empty}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={card}>
          <h2 className={heading}>Ausgaben nach Geschäft</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : empty}
        </div>

        <div className={card}>
          <h2 className={heading}>Top 10 Geschäfte</h2>
          {stats.by_store.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">Geschäft</th>
                  <th className="pb-2 font-medium text-center">Besuche</th>
                  <th className="pb-2 font-medium text-right">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_store.map((s, i) => (
                  <tr key={s.store} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {s.store}
                    </td>
                    <td className="py-2 text-center text-gray-500 dark:text-gray-400">{s.visit_count}</td>
                    <td className="py-2 text-right font-medium text-gray-800 dark:text-gray-100">{fmtCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : empty}
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">Monatsübersicht</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[380px]">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500 dark:text-gray-400">Monat</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400">Belege</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500 dark:text-gray-400">Durchschnitt</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-500 dark:text-gray-400">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map((m) => (
                <tr key={m.name} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800 dark:text-gray-200">{m.name}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400">{m.count}</td>
                  <td className="px-5 py-2.5 text-right text-gray-500 dark:text-gray-400">{fmtCurrency(m.avg)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-800 dark:text-gray-100">{fmtCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

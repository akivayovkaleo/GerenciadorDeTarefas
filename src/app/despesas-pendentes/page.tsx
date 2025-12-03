"use client";

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { Expense } from '@/lib/calculations';
import { parseISO, getISOWeek, format, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
const ChartsClient = React.lazy(() => import('@/components/ChartsClient'));

function toISO(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function DespesasPendentesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(() => toISO(new Date()));

  useEffect(() => {
    try {
      const saved = localStorage.getItem('expenses');
      if (saved) setExpenses(JSON.parse(saved) as Expense[]);
    } catch (e) {
      console.error('Erro ao carregar despesas:', e);
    }
  }, []);

  const pending = useMemo(() => expenses.filter(e => !e.paid && e.dueDate), [expenses]);

  const filtered = useMemo(() => {
    if (!selectedDate) return [] as Expense[];
    if (period === 'day') {
      return pending.filter(e => e.dueDate === selectedDate);
    }

    if (period === 'month') {
      const prefix = selectedDate.slice(0, 7); // YYYY-MM
      return pending.filter(e => e.dueDate && e.dueDate.startsWith(prefix));
    }

    // week
    const ref = parseISO(selectedDate);
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    const end = endOfWeek(ref, { weekStartsOn: 1 });
    return pending.filter(e => {
      if (!e.dueDate) return false;
      const d = parseISO(e.dueDate);
      return isWithinInterval(d, { start, end });
    });
  }, [pending, period, selectedDate]);

  const total = useMemo(() => filtered.reduce((s, x) => s + x.amount, 0), [filtered]);

  const chartData = useMemo(() => {
    if (period === 'day') {
      // show list by category or individual items
      const labels = filtered.map(f => f.description || f.id);
      const data = filtered.map(f => f.amount);
      return { labels, datasets: [{ label: 'A pagar (R$)', data, backgroundColor: '#f59e0b' }] };
    }

    if (period === 'month') {
      const groups: Record<string, number> = {};
      filtered.forEach(f => {
        const k = f.dueDate ? f.dueDate.slice(8, 10) : '??'; // day of month
        groups[k] = (groups[k] || 0) + f.amount;
      });
      const labels = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
      const data = labels.map(l => groups[l]);
      return { labels, datasets: [{ label: 'A pagar (R$)', data, backgroundColor: '#f59e0b' }] };
    }

    // week: group by weekday name
    const names = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const groups: number[] = Array(7).fill(0);
    filtered.forEach(f => {
      if (!f.dueDate) return;
      const d = parseISO(f.dueDate);
      const idx = (d.getDay() + 6) % 7; // make Monday=0
      groups[idx] += f.amount;
    });
    return { labels: names, datasets: [{ label: 'A pagar (R$)', data: groups, backgroundColor: '#f59e0b' }] };
  }, [filtered, period]);

  function exportCsv() {
    const rows = [
      ['id', 'description', 'category', 'type', 'amount', 'date', 'dueDate', 'paid'],
      ...filtered.map(f => [f.id, f.description, f.category, f.type, f.amount.toFixed(2), f.date || '', f.dueDate || '', f.paid ? '1' : '0']),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despesas_pendentes_${period}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Despesas a Pagar</h1>
        <p className="text-gray-600">Visualize obrigações pendentes por dia, semana ou mês</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Período:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="px-3 py-1 border rounded">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>

        <div>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-1 border rounded" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportCsv} className="px-3 py-1 bg-yellow-600 text-white rounded">Exportar CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Total pendente (filtro)</p>
          <p className="text-2xl font-bold text-yellow-600">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-2">{filtered.length} itens</p>
        </div>
        <div className="p-4 bg-white rounded shadow col-span-2">
          <Suspense fallback={<div>Carregando gráfico...</div>}>
            <ChartsClient data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </Suspense>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Itens pendentes</h2>
        {filtered.length === 0 ? (
          <p className="text-gray-500">Nenhum item pendente neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-xs text-gray-600 border-b">
                <tr>
                  <th className="py-2">Vencimento</th>
                  <th className="py-2">Descrição</th>
                  <th className="py-2">Categoria</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b">
                    <td className="py-2">{formatISOToBR(f.dueDate)}</td>
                    <td className="py-2">{f.description}</td>
                    <td className="py-2">{f.category}</td>
                    <td className="py-2 text-right">R$ {f.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatISOToBR(dateStr?: string) {
  if (!dateStr) return '-';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

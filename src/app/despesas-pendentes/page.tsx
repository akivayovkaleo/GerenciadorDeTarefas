"use client";

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { Expense } from '@/lib/calculations';
import { parseISO, getISOWeek, format, isWithinInterval, startOfWeek, endOfWeek, getDay } from 'date-fns';
const ChartsClient = React.lazy(() => import('@/components/ChartsClient'));

function toISO(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function DespesasPendentesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(() => toISO(new Date()));
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [paymentDayFilter, setPaymentDayFilter] = useState<string>('all');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('expenses');
      if (saved) setExpenses(JSON.parse(saved) as Expense[]);
    } catch (e) {
      console.error('Erro ao carregar despesas:', e);
    }
  }, []);

  const pending = useMemo(() => expenses.filter(e => !e.paid && e.dueDate), [expenses]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach(e => { if (e.category) s.add(e.category); });
    return Array.from(s).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    let baseFiltered = pending;

    if (paymentDayFilter !== 'all') {
      const dayIndex = parseInt(paymentDayFilter, 10);
      baseFiltered = baseFiltered.filter(e => e.dueDate && getDay(parseISO(e.dueDate)) === dayIndex);
    }

    if (!selectedDate) return [] as Expense[];
    if (period === 'day') {
      return baseFiltered.filter(e => e.dueDate === selectedDate && (categoryFilter === 'all' || e.category === categoryFilter) && e.description.toLowerCase().includes(searchText.toLowerCase()));
    }

    if (period === 'month') {
      const prefix = selectedDate.slice(0, 7); // YYYY-MM
      return baseFiltered.filter(e => e.dueDate && e.dueDate.startsWith(prefix) && (categoryFilter === 'all' || e.category === categoryFilter) && e.description.toLowerCase().includes(searchText.toLowerCase()));
    }

    // week
    const ref = parseISO(selectedDate);
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    const end = endOfWeek(ref, { weekStartsOn: 1 });
    return baseFiltered.filter(e => {
      if (!e.dueDate) return false;
      const d = parseISO(e.dueDate);
      return isWithinInterval(d, { start, end }) && (categoryFilter === 'all' || e.category === categoryFilter) && e.description.toLowerCase().includes(searchText.toLowerCase());
    });
  }, [pending, period, selectedDate, categoryFilter, searchText, paymentDayFilter]);

  const total = useMemo(() => filtered.reduce((s, x) => s + x.amount, 0), [filtered]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const chartData = useMemo(() => {
    if (period === 'day') {
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
      const todayDay = String(today.slice(8, 10));
      const backgroundColor = labels.map(l => (l === todayDay ? '#ef4444' : '#f59e0b'));
      return { labels, datasets: [{ label: 'A pagar (R$)', data, backgroundColor }] };
    }

    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const groups: number[] = Array(7).fill(0);
    filtered.forEach(f => {
      if (!f.dueDate) return;
      const d = parseISO(f.dueDate);
      const idx = getDay(d);
      groups[idx] += f.amount;
    });

    const todayDayOfWeek = getDay(new Date());
    const backgroundColor = groups.map((_, idx) => (idx === todayDayOfWeek ? '#ef4444' : '#f59e0b'));
    return { labels: names, datasets: [{ label: 'A pagar (R$)', data: groups, backgroundColor }] };
  }, [filtered, period, selectedDate, today]);

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

  function exportAggregatedByMonth() {
    const groups: Record<string, number> = {};
    filtered.forEach(f => {
      const key = f.dueDate ? f.dueDate.slice(0, 7) : 'unknown';
      groups[key] = (groups[key] || 0) + f.amount;
    });
    const rows = [['month', 'total']].concat(Object.keys(groups).sort().map(k => [k, groups[k].toFixed(2)]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despesas_pendentes_aggregated_${period}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAllVisible(checked: boolean) {
    const map: Record<string, boolean> = { ...selectedIds };
    filtered.forEach(f => { map[f.id] = checked; });
    setSelectedIds(map);
  }

  function markSelectedAsPaid() {
    const ids = Object.keys(selectedIds).filter(k => selectedIds[k]);
    if (ids.length === 0) return;
    const updated = expenses.map(e => ids.includes(e.id) ? { ...e, paid: true } : e);
    setExpenses(updated);
    localStorage.setItem('expenses', JSON.stringify(updated));
    setSelectedIds({});
  }

  function markAllVisibleAsPaid() {
    const ids = filtered.map(f => f.id);
    const updated = expenses.map(e => ids.includes(e.id) ? { ...e, paid: true } : e);
    setExpenses(updated);
    localStorage.setItem('expenses', JSON.stringify(updated));
    setSelectedIds({});
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
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="input">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>

        <div>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Categoria:</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input">
            <option value="all">Todas</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Dia de Pagamento:</label>
          <select value={paymentDayFilter} onChange={(e) => setPaymentDayFilter(e.target.value)} className="input">
            <option value="all">Todos</option>
            <option value="0">Domingo</option>
            <option value="1">Segunda</option>
            <option value="2">Terça</option>
            <option value="3">Quarta</option>
            <option value="4">Quinta</option>
            <option value="5">Sexta</option>
            <option value="6">Sábado</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input placeholder="Buscar descrição" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="input" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportCsv} className="btn-primary">Exportar CSV</button>
          <button onClick={exportAggregatedByMonth} className="btn-secondary">Exportar Agregado</button>
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
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm">Seleção:</label>
          <button onClick={() => selectAllVisible(true)} className="btn-secondary">Selecionar todos visíveis</button>
          <button onClick={() => selectAllVisible(false)} className="btn-secondary">Limpar seleção</button>
          <button onClick={markSelectedAsPaid} className="btn-primary">Marcar selecionados como pagos</button>
          <button onClick={markAllVisibleAsPaid} className="btn-primary">Marcar todos visíveis como pagos</button>
        </div>
        {filtered.length === 0 ? (
          <p className="text-gray-500">Nenhum item pendente neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-left text-xs text-gray-600 border-b">
                <tr>
                  <th className="py-2"><input type="checkbox" onChange={(e) => selectAllVisible(e.target.checked)} /></th>
                  <th className="py-2">Vencimento</th>
                  <th className="py-2">Descrição</th>
                  <th className="py-2">Categoria</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className={`border-b ${f.installments && f.installments > 1 ? 'bg-yellow-50' : ''}`}>
                    <td className="py-2"><input type="checkbox" checked={!!selectedIds[f.id]} onChange={() => toggleSelect(f.id)} /></td>
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

"use client";

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';

const ChartsClient = lazy(() => import('@/components/ChartsClient'));

type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  type?: 'receita' | 'despesa';
};

const monthsToShow = 6;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
}

export default function GraficosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('expenses');
      if (raw) {
        setExpenses(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Erro ao ler despesas do localStorage', e);
    }
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => e.category && set.add(e.category));
    return ['all', ...Array.from(set)];
  }, [expenses]);

  // build last N months keys
  const now = new Date();
  const months: string[] = [];
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (startDate && new Date(e.date) < new Date(startDate)) return false;
      if (endDate && new Date(e.date) > new Date(endDate)) return false;
      return true;
    });
  }, [expenses, filterType, filterCategory, startDate, endDate]);

  const byMonth: Record<string, { receita: number; despesa: number }> = {};
  months.forEach((m) => (byMonth[m] = { receita: 0, despesa: 0 }));

  filtered.forEach((e) => {
    const d = new Date(e.date);
    const k = monthKey(d);
    if (!byMonth[k]) return;
    if (e.type === 'receita') byMonth[k].receita += e.amount;
    else byMonth[k].despesa += e.amount;
  });

  const labels = months.map((m) => getMonthLabel(m));
  const receitaData = months.map((m) => Number(byMonth[m].receita.toFixed(2)));
  const despesaData = months.map((m) => Number(byMonth[m].despesa.toFixed(2)));

  const azulMercearia = '#0a7df5';
  const amareloQueimado = '#f5b50a';

  // Helper to generate shades for pie charts
  function generateShades(baseColor: string, count: number): string[] {
    const shades: Record<string, string[]> = {
      '#0a7df5': ['#0a7df5', '#2a92f6', '#4aa7f7', '#6bbcf8', '#8ccff9', '#adddfa'],
      '#f5b50a': ['#f5b50a', '#f6be2a', '#f7c74a', '#f8d06a', '#f9d98a', '#fae2aa'],
    };
    const selectedShades = shades[baseColor] || ['#cccccc'];
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(selectedShades[i % selectedShades.length]);
    }
    return result;
  }

  const data = {
    labels,
    datasets: [
      {
        label: 'Receitas',
        data: receitaData,
        backgroundColor: azulMercearia,
      },
      {
        label: 'Despesas',
        data: despesaData,
        backgroundColor: amareloQueimado,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Receitas vs. Despesas Mensais', font: { size: 16 } },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        grid: { display: false },
      }
    },
  };

  // Pie chart: Receitas vs Despesas (totals)
  const totalReceita = filtered.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
  const totalDespesa = filtered.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);

  const pieDataReceiptVsExpense = {
    labels: ['Receitas', 'Despesas'],
    datasets: [{
      data: [totalReceita, totalDespesa],
      backgroundColor: [azulMercearia, amareloQueimado],
    }],
  };

  const createPieOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: title, font: { size: 16 } },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.getDatasetMeta(0).total || 1;
            const percentage = ((value / total) * 100).toFixed(2);
            const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
            return `${label}: ${formattedValue} (${percentage}%)`;
          }
        }
      }
    },
  });

  const pieOptionsReceiptVsExpense = createPieOptions('Receitas vs. Despesas (Total)');
  const pieOptionsDespesa = createPieOptions('Distribuição de Despesas por Categoria');
  const pieOptionsReceita = createPieOptions('Distribuição de Receitas por Categoria');

  // Pie chart: only Despesas by category
  const despesasByCategory: Record<string, number> = {};
  filtered.filter(e => e.type === 'despesa').forEach(e => {
    const cat = e.category || 'Sem categoria';
    despesasByCategory[cat] = (despesasByCategory[cat] || 0) + e.amount;
  });

  const pieLabelsDespesa = Object.keys(despesasByCategory);
  const pieDataDespesa = {
    labels: pieLabelsDespesa,
    datasets: [{
      data: pieLabelsDespesa.map(l => despesasByCategory[l]),
      backgroundColor: generateShades(amareloQueimado, pieLabelsDespesa.length),
    }],
  };

  // Pie chart: only Receitas by category
  const receitasByCategory: Record<string, number> = {};
  filtered.filter(e => e.type === 'receita').forEach(e => {
    const cat = e.category || 'Sem categoria';
    receitasByCategory[cat] = (receitasByCategory[cat] || 0) + e.amount;
  });

  const pieLabelsReceita = Object.keys(receitasByCategory);
  const pieDataReceita = {
    labels: pieLabelsReceita,
    datasets: [{
      data: pieLabelsReceita.map(l => receitasByCategory[l]),
      backgroundColor: generateShades(azulMercearia, pieLabelsReceita.length),
    }],
  };

  function exportCsv() {
    // export filtered items (not aggregated) to CSV
    const rows = [['id', 'description', 'amount', 'date', 'category', 'type']];
    filtered.forEach((e) => rows.push([e.id, e.description, e.amount.toFixed(2), e.date, e.category || '', e.type || '']));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAggregated() {
    // export aggregated monthly totals to CSV
    const rows = [['Mês', 'Receitas', 'Despesas', 'Saldo']];
    months.forEach((m) => {
      const receitas = byMonth[m].receita;
      const despesas = byMonth[m].despesa;
      const saldo = receitas - despesas;
      rows.push([
        getMonthLabel(m),
        receitas.toFixed(2),
        despesas.toFixed(2),
        saldo.toFixed(2),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo_mensal_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-blue-900 mb-4">Gráficos de Movimentos</h2>
      <p className="text-sm text-gray-600 mb-4">Resumo dos últimos {monthsToShow} meses (receitas vs despesas)</p>

      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex gap-3 flex-wrap items-center">
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Tipo:
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="px-2 py-1 border rounded">
              <option value="all">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </label>

          <label className="text-sm text-gray-600 flex items-center gap-2">
            Categoria:
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-2 py-1 border rounded">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600 flex items-center gap-2">
            De:
            <input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value || null)} className="px-2 py-1 border rounded" />
          </label>

          <label className="text-sm text-gray-600 flex items-center gap-2">
            Até:
            <input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value || null)} className="px-2 py-1 border rounded" />
          </label>

          <div className="ml-auto flex gap-2">
            <button onClick={exportCsv} className="bg-blue-900 text-white px-3 py-1 rounded hover:bg-opacity-90 transition">Detalhado</button>
            <button onClick={exportAggregated} className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-opacity-90 transition">Resumo Mensal</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow" style={{ height: 360 }}>
        <Suspense
          fallback={
            <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded animate-pulse flex flex-col items-center justify-center">
              <div className="text-center space-y-3">
                <div className="h-3 w-48 bg-gray-300 rounded mx-auto"></div>
                <div className="h-3 w-32 bg-gray-300 rounded mx-auto"></div>
              </div>
            </div>
          }
        >
          <ChartsClient options={options} data={data} type="bar" />
        </Suspense>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow" style={{ height: 300 }}>
          <Suspense fallback={<div>Carregando...</div>}>
            <ChartsClient options={pieOptionsReceiptVsExpense} data={pieDataReceiptVsExpense} type="pie" />
          </Suspense>
        </div>

        <div className="bg-white p-4 rounded shadow" style={{ height: 300 }}>
          <Suspense fallback={<div>Carregando...</div>}>
            <ChartsClient options={pieOptionsDespesa} data={pieDataDespesa} type="pie" />
          </Suspense>
        </div>

        <div className="bg-white p-4 rounded shadow" style={{ height: 300 }}>
          <Suspense fallback={<div>Carregando...</div>}>
            <ChartsClient options={pieOptionsReceita} data={pieDataReceita} type="pie" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

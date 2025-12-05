'use client';

import { useState, useMemo, useEffect } from 'react';
import { Expense } from '@/lib/calculations';
import { calculateDailyTarget, calculateWeeklyTarget, calculateMonthlyTarget } from '@/lib/analysis';

interface AverageAnalysisProps {
  expenses: Expense[];
}

export default function AverageAnalysis({ expenses }: AverageAnalysisProps) {
  const [monthsBack, setMonthsBack] = useState(3);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDay, setSelectedDay] = useState(new Date());

  useEffect(() => {
    const savedMonthsBack = localStorage.getItem('monthsBack');
    if (savedMonthsBack) {
      setMonthsBack(parseInt(savedMonthsBack, 10));
    }
  }, []);

  const handleMonthsBackChange = (months: number) => {
    setMonthsBack(months);
    localStorage.setItem('monthsBack', months.toString());
  };

  const handleDayChange = (date: Date) => {
    setSelectedDay(date);
  };

  const dailyTarget = useMemo(() => calculateDailyTarget(expenses, monthsBack, selectedDay), [expenses, monthsBack, selectedDay]);
  const weeklyTarget = useMemo(() => calculateWeeklyTarget(expenses, monthsBack), [expenses, monthsBack]);
  const monthlyTarget = useMemo(() => calculateMonthlyTarget(expenses, monthsBack), [expenses, monthsBack]);

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatSelectedDay = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return `Meta para ${capitalizedDayOfWeek}, dia ${date.getDate()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 bg-blue-900 text-white">
        <h2 className="text-2xl font-bold">Análise de Médias</h2>
        <p className="text-yellow-300 mt-1">Metas de faturamento com base em meses anteriores</p>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === 'daily' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Diária
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === 'weekly' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === 'monthly' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensal
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período de Análise
            </label>
            <select
              value={monthsBack}
              onChange={(e) => handleMonthsBackChange(parseInt(e.target.value))}
              className="input"
            >
              {[1, 2, 3, 4, 5, 6, 12].map((n) => (
                <option key={n} value={n}>
                  Últimos {n} mês{n > 1 ? 'es' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione o Dia
                </label>
                <input
                  type="date"
                  value={formatDateForInput(selectedDay)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                    handleDayChange(new Date(date.getTime() + userTimezoneOffset));
                  }}
                  className="input"
                />
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-yellow-600">
                <p className="text-gray-600 text-sm">{formatSelectedDay(selectedDay)}</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">
                  R$ {dailyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'weekly' && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-l-4 border-green-600">
              <p className="text-gray-600 text-sm">Meta para esta Semana</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                R$ {weeklyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {activeTab === 'monthly' && (
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border-l-4 border-blue-900">
              <p className="text-gray-600 text-sm">Meta para este Mês</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">
                R$ {monthlyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

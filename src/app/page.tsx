"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp } from 'firebase/firestore';

// Tipo para representar uma transação
type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  date: Date | Timestamp;
};

// Função para formatar a data
const formatDate = (date: Date | Timestamp) => {
  if (date instanceof Date) {
    return date.toLocaleDateString('pt-BR');
  }
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString('pt-BR');
  }
  return 'Data inválida';
};

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [months, setMonths] = useState(3);
  const [averageType, setAverageType] = useState('daily');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca as transações ao carregar a página
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'transacoes'));
        const querySnapshot = await getDocs(q);
        const transactionsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date.toDate(), // Convertendo Timestamp para Date
          } as Transaction;
        });
        setTransactions(transactionsData);
      } catch (error) {
        setError('Falha ao carregar transações. Tente recarregar a página.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Lógica para calcular a média
  const averageData = useMemo(() => {
    if (transactions.length === 0) return { average: 0, relevantTransactions: [] };

    const targetDate = new Date(selectedDate);
    targetDate.setUTCHours(0, 0, 0, 0);

    let total = 0;
    let count = 0;
    let daysFound = new Set<string>();
    let weeksFound = new Set<string>();
    let monthsFound = new Set<string>();

    if (averageType === 'daily') {
      const dailyTotals = new Map<string, number>();
      transactions.forEach(t => {
        if (t.type === 'receita') {
          const dateStr = (t.date as Date).toISOString().split('T')[0];
          dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + t.amount);
        }
      });

      let currentMonth = new Date(targetDate);
      let monthsChecked = 0;

      while (monthsChecked < months) {
        const dateToCheck = new Date(currentMonth);
        dateToCheck.setUTCDate(targetDate.getUTCDate());

        if (dateToCheck.getUTCMonth() === currentMonth.getUTCMonth()) {
            const dateStr = dateToCheck.toISOString().split('T')[0];
            if (dailyTotals.has(dateStr) && !daysFound.has(dateStr)) {
                total += dailyTotals.get(dateStr)!;
                daysFound.add(dateStr);
            }
        }

        currentMonth.setUTCMonth(currentMonth.getUTCMonth() - 1);
        monthsChecked++;
      }
      count = daysFound.size;

    } else if (averageType === 'weekly') {
      const weeklyTotals = new Map<string, number>();
      transactions.forEach(t => {
          if (t.type === 'receita') {
              const date = t.date as Date;
              const weekStart = new Date(date);
              weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
              const weekStartStr = weekStart.toISOString().split('T')[0];
              weeklyTotals.set(weekStartStr, (weeklyTotals.get(weekStartStr) || 0) + t.amount);
          }
      });

      let weeksChecked = 0;
      let currentDate = new Date(targetDate);

      while(weeksChecked < months * 4) {
        const weekStart = new Date(currentDate);
        weekStart.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];

        if(weeklyTotals.has(weekStartStr) && !weeksFound.has(weekStartStr)) {
          total += weeklyTotals.get(weekStartStr)!;
          weeksFound.add(weekStartStr);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() - 7);
        weeksChecked++;
      }
      count = weeksFound.size;

    } else { // monthly
      const monthlyTotals = new Map<string, number>();
        transactions.forEach(t => {
            if (t.type === 'receita') {
                const date = t.date as Date;
                const monthYear = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
                monthlyTotals.set(monthYear, (monthlyTotals.get(monthYear) || 0) + t.amount);
            }
        });

        let monthsChecked = 0;
        let currentDate = new Date(targetDate);

        while(monthsChecked < months) {
            const monthYear = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}`;
            if (monthlyTotals.has(monthYear) && !monthsFound.has(monthYear)) {
                total += monthlyTotals.get(monthYear)!;
                monthsFound.add(monthYear);
            }
            currentDate.setUTCMonth(currentDate.getUTCMonth() - 1);
            monthsChecked++;
        }
        count = monthsFound.size;
    }

    const finalRelevantTransactions = transactions.filter(t => {
      const date = t.date as Date;
      if (averageType === 'daily') {
        const dateStr = date.toISOString().split('T')[0];
        return daysFound.has(dateStr);
      } else if (averageType === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        return weeksFound.has(weekStartStr);
      } else { // monthly
        const monthYear = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
        return monthsFound.has(monthYear);
      }
    });

    return {
      average: count > 0 ? total / count : 0,
      relevantTransactions: finalRelevantTransactions
    };
  }, [transactions, selectedDate, months, averageType]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-azul-mercearia">Cálculo de Médias</h1>

      {/* Seletor de Data e Meses */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 transition-shadow hover:shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label htmlFor="date-selector" className="block text-sm font-medium text-gray-700">
              Selecione o Dia
            </label>
            <input
              type="date"
              id="date-selector"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
            />
          </div>
          <div>
            <label htmlFor="months-selector" className="block text-sm font-medium text-gray-700">
              Meses para Média
            </label>
            <input
              type="number"
              id="months-selector"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="average-type-selector" className="block text-sm font-medium text-gray-700">
              Tipo de Média
            </label>
            <select
              id="average-type-selector"
              value={averageType}
              onChange={(e) => setAverageType(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
            >
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Planilha de Médias */}
      <div className="bg-white p-6 rounded-lg shadow-lg transition-shadow hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Média de Vendas</h2>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500">Carregando dados...</p>
          ) : error ? (
            <p className="text-center text-red-500 bg-red-100 p-2 rounded-md">{error}</p>
          ) : (
            <div>
              <div className="text-center mb-4">
                <p className="text-lg">Média para o período selecionado:</p>
                <p className="text-3xl font-bold text-azul-mercearia">
                  R$ {averageData.average.toFixed(2)}
                </p>
              </div>
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Data</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Descrição</th>
                    <th className="py-3 px-4 border-b text-right font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {averageData.relevantTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b">{formatDate(t.date)}</td>
                      <td className="py-3 px-4 border-b">{t.description}</td>
                      <td className={`py-3 px-4 border-b text-right font-semibold text-green-600`}>
                        R$ {t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

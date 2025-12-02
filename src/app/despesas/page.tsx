"use client";

import { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';

// Tipo para representar uma transação
type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  date: string;
};

export default function DespesasPage() {
  // Estado para o formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount]       = useState<number | ''>('');
  const [type, setType]           = useState<'receita' | 'despesa'>('despesa');
  const [category, setCategory]   = useState('Outros');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [adding, setAdding]       = useState(false);

  // Função para buscar as transações do Firestore
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'transacoes'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: new Date(doc.data().date.seconds * 1000).toLocaleDateString('pt-BR'),
      })) as Transaction[];
      setTransactions(transactionsData);
    } catch (error) {
      setError('Falha ao carregar transações. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };

  // Busca as transações ao carregar a página
  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount === '') return;
    setAdding(true);
    setError(null);

    try {
      await addDoc(collection(db, 'transacoes'), {
        description,
        amount: Number(amount),
        type,
        category,
        date: date ? Timestamp.fromDate(new Date(date)) : serverTimestamp(),
      });

      setDescription('');
      setAmount('');
      setCategory('Outros');
      setDate(new Date().toISOString().split('T')[0]);
      await fetchTransactions();
    } catch (error) {
      setError('Ocorreu um erro ao salvar a transação. Tente novamente.');
    } finally {
      setAdding(false);
    }
  };

  // Cálculos para o resumo
  const summary = useMemo(() => {
    const totalReceitas = transactions
      .filter(t => t.type === 'receita')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalDespesas = transactions
      .filter(t => t.type === 'despesa')
      .reduce((acc, t) => acc + t.amount, 0);

    const saldo = totalReceitas - totalDespesas;

    return { totalReceitas, totalDespesas, saldo };
  }, [transactions]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-azul-mercearia">Gerenciador de Despesas</h1>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
        <div className="bg-green-100 p-4 rounded-lg shadow-lg transition-shadow hover:shadow-xl">
          <h3 className="font-semibold text-green-800">Total de Receitas</h3>
          <p className="text-2xl font-bold text-green-600">R$ {summary.totalReceitas.toFixed(2)}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow-lg transition-shadow hover:shadow-xl">
          <h3 className="font-semibold text-red-800">Total de Despesas</h3>
          <p className="text-2xl font-bold text-red-600">R$ {summary.totalDespesas.toFixed(2)}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg shadow-lg transition-shadow hover:shadow-xl">
          <h3 className="font-semibold text-blue-800">Saldo Atual</h3>
          <p className="text-2xl font-bold text-blue-600">R$ {summary.saldo.toFixed(2)}</p>
        </div>
      </div>

      {/* Formulário para Adicionar Transação */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8 transition-shadow hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Adicionar Nova Transação</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="col-span-1 md:col-span-2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
            required
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Valor"
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
            required
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'receita' | 'despesa')}
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
          >
            <option>Fornecedores</option>
            <option>Contas</option>
            <option>Limpeza</option>
            <option>Outros</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-mercearia"
          />
          <button
            type="submit"
            className="col-span-1 md:col-start-6 bg-azul-mercearia text-white px-6 py-2 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50"
            disabled={adding}
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
        {error && <p className="mt-4 text-center text-red-500 bg-red-100 p-2 rounded-md">{error}</p>}
      </div>

      {/* Lista de Transações */}
      <div className="bg-white p-6 rounded-lg shadow-lg transition-shadow hover:shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Histórico de Transações</h2>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500">Carregando histórico...</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Descrição</th>
                  <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Categoria</th>
                  <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Tipo</th>
                  <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Data</th>
                  <th className="py-3 px-4 border-b text-right font-semibold text-gray-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">{t.description}</td>
                    <td className="py-3 px-4 border-b">{t.category}</td>
                    <td className="py-3 px-4 border-b">{t.type === 'receita' ? 'Receita' : 'Despesa'}</td>
                    <td className="py-3 px-4 border-b">{t.date}</td>
                    <td className={`py-3 px-4 border-b text-right font-semibold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

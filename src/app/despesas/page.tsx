'use client';

import { useState, useEffect } from 'react';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import { Expense } from '@/lib/calculations';

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const today = new Date();
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('expenses');
      if (saved) {
        const parsed = JSON.parse(saved) as Expense[];
        setExpenses(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses, isLoading]);

  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      id: Math.random().toString(36).substring(2, 11) + Date.now(),
      ...expense,
    };
    setExpenses([...expenses, newExpense]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const handleTogglePaid = (id: string) => {
    setExpenses(expenses.map(exp => (exp.id === id ? { ...exp, paid: !exp.paid } : exp)));
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleSaveEdit = (updatedExpense: Expense) => {
    setExpenses(expenses.map(exp => (exp.id === updatedExpense.id ? updatedExpense : exp)));
    setEditingExpense(null);
  };

  const expensesFiltradas = expenses.filter(expense => {
    return expense.date >= startDate && expense.date <= endDate;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Gerenciador de Movimentos</h1>
        <p className="text-gray-600">Registre entradas (receitas) e saídas (despesas) da sua mercearia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border-l-4 border-blue-900">
          <p className="text-gray-600 text-sm font-medium">Total de Receitas</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">
            R$ {expensesFiltradas.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-2">{expensesFiltradas.filter(e => e.type === 'receita').length} registros</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg shadow-md border-l-4 border-yellow-600">
          <p className="text-gray-600 text-sm font-medium">Total de Despesas</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            R$ {expensesFiltradas.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-2">{expensesFiltradas.filter(e => e.type === 'despesa').length} registros</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border-l-4 border-green-600">
          <p className="text-gray-600 text-sm font-medium">Saldo (Receitas - Despesas)</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            R$ {(expensesFiltradas.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0) - expensesFiltradas.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-2">{new Set(expensesFiltradas.map(e => e.category)).size} categorias</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Filtrar por Período</h2>
        <div className="flex gap-4">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
        </div>
      </div>

      {editingExpense && (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8 border-l-4 border-yellow-600">
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">Editando Lançamento</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSaveEdit(editingExpense);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={editingExpense.description}
                onChange={e => setEditingExpense({ ...editingExpense, description: e.target.value })}
                placeholder="Descrição"
                className="input"
                required
              />
              <input
                type="number"
                value={editingExpense.amount}
                onChange={e => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                placeholder="Valor"
                className="input"
                required
              />
              <select
                name="type"
                value={editingExpense.type}
                onChange={e => setEditingExpense({ ...editingExpense, type: e.target.value as 'receita' | 'despesa' })}
                className="input"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
              <input
                type="date"
                value={editingExpense.date.split('T')[0]}
                onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })}
                className="input"
                required
              />
              <select
                name="category"
                value={editingExpense.category}
                onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}
                className="input"
              >
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Moradia">Moradia</option>
                <option value="Lazer">Lazer</option>
                <option value="Saúde">Saúde</option>
                <option value="Salário">Salário</option>
                <option value="Outros">Outros</option>
              </select>
              <input
                type="date"
                value={editingExpense.dueDate?.split('T')[0] || ''}
                onChange={e => setEditingExpense({ ...editingExpense, dueDate: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingExpense.paid}
                  onChange={e => setEditingExpense({ ...editingExpense, paid: e.target.checked })}
                  className="mr-2"
                />
                Pago
              </label>
              <input
                type="number"
                value={editingExpense.installments || 1}
                onChange={e => setEditingExpense({ ...editingExpense, installments: parseInt(e.target.value, 10) })}
                placeholder="Parcelas"
                className="input w-24"
                min="1"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      <ExpenseForm onAddExpense={handleAddExpense} />

      <ExpenseList expenses={expensesFiltradas} onDeleteExpense={handleDeleteExpense} onTogglePaid={handleTogglePaid} onEditExpense={handleEditExpense} />
    </div>
  );
}

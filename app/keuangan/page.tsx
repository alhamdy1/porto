'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';

// Types
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: number;
}

interface Budget {
  category: string;
  limit: number;
}

// Categories
const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Gaji', icon: '💼' },
  { id: 'business', name: 'Bisnis', icon: '🏪' },
  { id: 'investment', name: 'Investasi', icon: '📈' },
  { id: 'freelance', name: 'Freelance', icon: '💻' },
  { id: 'gift', name: 'Hadiah', icon: '🎁' },
  { id: 'other_income', name: 'Lainnya', icon: '💵' },
];

const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Makanan & Minuman', icon: '🍔' },
  { id: 'transport', name: 'Transportasi', icon: '🚗' },
  { id: 'shopping', name: 'Belanja', icon: '🛒' },
  { id: 'bills', name: 'Tagihan', icon: '📄' },
  { id: 'health', name: 'Kesehatan', icon: '🏥' },
  { id: 'entertainment', name: 'Hiburan', icon: '🎬' },
  { id: 'education', name: 'Pendidikan', icon: '📚' },
  { id: 'savings', name: 'Tabungan', icon: '🏦' },
  { id: 'other_expense', name: 'Lainnya', icon: '📦' },
];

// Utility functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

function parseFormattedNumber(str: string): number {
  return parseInt(str.replace(/\D/g, '')) || 0;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getCategoryInfo(categoryId: string, type: 'income' | 'expense') {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find(c => c.id === categoryId) || { id: categoryId, name: categoryId, icon: '📌' };
}

// Local Storage keys
const STORAGE_KEY = 'keuangan_transactions';
const BUDGET_STORAGE_KEY = 'keuangan_budgets';

// Chart colors
const INCOME_CHART_COLORS = ['bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-green-400'];
const EXPENSE_CHART_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500', 'bg-red-400'];

// Summary Card Component
function SummaryCard({ title, amount, icon, color, subtitle }: {
  title: string;
  amount: number;
  icon: string;
  color: 'green' | 'red' | 'blue' | 'purple';
  subtitle?: string;
}) {
  const colorClasses = {
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };

  return (
    <div className={`rounded-2xl p-5 border backdrop-blur-sm shadow-xl ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-slate-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{formatCurrency(amount)}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Transaction Form Component
function TransactionForm({ onAdd }: { onAdd: (transaction: Transaction) => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFormattedNumber(amount);
    if (parsedAmount <= 0 || !category) return;

    const transaction: Transaction = {
      id: generateId(),
      type,
      amount: parsedAmount,
      category,
      description: description.trim(),
      date,
      createdAt: Date.now(),
    };

    onAdd(transaction);
    setAmount('');
    setDescription('');
    setCategory('');
  }, [type, amount, category, description, date, onAdd]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">➕</span>
        Tambah Transaksi
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setType('income'); setCategory(''); }}
            className={`py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            📥 Pemasukan
          </button>
          <button
            type="button"
            onClick={() => { setType('expense'); setCategory(''); }}
            className={`py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              type === 'expense'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            📤 Pengeluaran
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Jumlah (Rp)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => {
              const value = parseFormattedNumber(e.target.value);
              setAmount(value > 0 ? formatNumber(value) : '');
            }}
            placeholder="Contoh: 500.000"
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Kategori</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`py-2 px-3 rounded-xl text-sm transition flex flex-col items-center gap-1 ${
                  category === cat.id
                    ? type === 'income' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Deskripsi (Opsional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Makan siang di kantor"
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Date Input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!amount || !category}
          className={`w-full py-3 rounded-xl font-semibold transition shadow-lg ${
            type === 'income'
              ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700'
              : 'bg-red-600 hover:bg-red-500 disabled:bg-slate-700'
          } text-white disabled:cursor-not-allowed disabled:shadow-none`}
        >
          Tambah {type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
        </button>
      </form>
    </div>
  );
}

// Transaction List Component
function TransactionList({ transactions, onDelete }: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => filter === 'all' || t.type === filter)
      .filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryInfo(t.category, t.type).name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, searchTerm]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">📋</span>
        Riwayat Transaksi
      </h3>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              filter === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              filter === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              filter === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            Pengeluaran
          </button>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari transaksi..."
          className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Transaction List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-4xl mb-2">📭</p>
            <p>Belum ada transaksi</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const categoryInfo = getCategoryInfo(transaction.category, transaction.type);
            return (
              <div
                key={transaction.id}
                className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800/50 transition border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryInfo.icon}</span>
                  <div>
                    <p className="text-white font-medium">{categoryInfo.name}</p>
                    {transaction.description && (
                      <p className="text-sm text-slate-500">{transaction.description}</p>
                    )}
                    <p className="text-xs text-slate-600">{formatDate(transaction.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-bold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Hapus"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Category Statistics Component
function CategoryStats({ transactions, type }: { transactions: Transaction[]; type: 'income' | 'expense' }) {
  const stats = useMemo(() => {
    const filteredTransactions = transactions.filter(t => t.type === type);
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const categoryTotals = categories.map(cat => {
      const categoryTotal = filteredTransactions
        .filter(t => t.category === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...cat,
        total: categoryTotal,
        percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
      };
    }).filter(cat => cat.total > 0).sort((a, b) => b.total - a.total);

    return { total, categoryTotals };
  }, [transactions, type]);

  const colors = type === 'income' ? INCOME_CHART_COLORS : EXPENSE_CHART_COLORS;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className={`w-8 h-8 bg-gradient-to-br ${type === 'income' ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-lg flex items-center justify-center text-sm`}>📊</span>
        {type === 'income' ? 'Statistik Pemasukan' : 'Statistik Pengeluaran'}
      </h3>

      {stats.categoryTotals.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-4xl mb-2">📊</p>
          <p>Belum ada data {type === 'income' ? 'pemasukan' : 'pengeluaran'}</p>
        </div>
      ) : (
        <>
          {/* Progress Bar Chart */}
          <div className="mb-4">
            <div className="h-6 rounded-full overflow-hidden flex bg-slate-900/50">
              {stats.categoryTotals.map((cat, idx) => (
                <div
                  key={cat.id}
                  className={`${colors[idx % colors.length]} transition-all duration-500`}
                  style={{ width: `${cat.percentage}%` }}
                  title={`${cat.name}: ${cat.percentage.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>

          {/* Category List */}
          <div className="space-y-3">
            {stats.categoryTotals.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                <span className="text-lg">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white">{cat.name}</span>
                    <span className={`font-bold ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>{cat.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className={`mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center`}>
            <span className="text-white font-semibold">Total</span>
            <span className={`text-xl font-bold ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(stats.total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Budget Manager Component
function BudgetManager({ budgets, onUpdate, expenses }: {
  budgets: Budget[];
  onUpdate: (budgets: Budget[]) => void;
  expenses: Transaction[];
}) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const budgetStats = useMemo(() => {
    return EXPENSE_CATEGORIES.map(cat => {
      const budget = budgets.find(b => b.category === cat.id);
      const spent = expenses
        .filter(e => e.category === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const limit = budget?.limit || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      const remaining = limit - spent;

      return {
        ...cat,
        limit,
        spent,
        percentage,
        remaining,
        status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'normal',
      };
    }).filter(b => b.limit > 0);
  }, [budgets, expenses]);

  const handleSetBudget = (categoryId: string) => {
    const value = parseFormattedNumber(editValue);
    if (value > 0) {
      const newBudgets = budgets.filter(b => b.category !== categoryId);
      newBudgets.push({ category: categoryId, limit: value });
      onUpdate(newBudgets);
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const handleRemoveBudget = (categoryId: string) => {
    onUpdate(budgets.filter(b => b.category !== categoryId));
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">💰</span>
        Anggaran Bulanan
      </h3>

      {/* Add Budget */}
      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-2">Tambah/Edit Anggaran</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setEditingCategory(cat.id);
                const existing = budgets.find(b => b.category === cat.id);
                setEditValue(existing ? formatNumber(existing.limit) : '');
              }}
              className="py-2 px-3 rounded-lg text-sm bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 transition flex items-center gap-2 border border-slate-700/50"
            >
              <span>{cat.icon}</span>
              <span className="text-xs">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700/50">
            <h4 className="text-lg font-semibold text-white mb-4">
              Set Anggaran: {getCategoryInfo(editingCategory, 'expense').icon} {getCategoryInfo(editingCategory, 'expense').name}
            </h4>
            <input
              type="text"
              value={editValue}
              onChange={(e) => {
                const value = parseFormattedNumber(e.target.value);
                setEditValue(value > 0 ? formatNumber(value) : '');
              }}
              placeholder="Contoh: 1.000.000"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSetBudget(editingCategory)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                Simpan
              </button>
              <button
                onClick={() => { setEditingCategory(null); setEditValue(''); }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Progress */}
      {budgetStats.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-4xl mb-2">💰</p>
          <p>Belum ada anggaran yang ditetapkan</p>
          <p className="text-sm mt-1">Klik kategori di atas untuk menambah anggaran</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetStats.map((budget) => (
            <div key={budget.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{budget.icon}</span>
                  <span className="text-white font-medium">{budget.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveBudget(budget.id)}
                  className="text-slate-500 hover:text-red-400 transition"
                  title="Hapus anggaran"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="h-3 rounded-full overflow-hidden bg-slate-800 mb-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    budget.status === 'exceeded' ? 'bg-red-500' :
                    budget.status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  Terpakai: <span className={
                    budget.status === 'exceeded' ? 'text-red-400' :
                    budget.status === 'warning' ? 'text-yellow-400' : 'text-emerald-400'
                  }>{formatCurrency(budget.spent)}</span>
                </span>
                <span className="text-slate-400">
                  Limit: <span className="text-white">{formatCurrency(budget.limit)}</span>
                </span>
              </div>
              
              {budget.remaining >= 0 ? (
                <p className="text-xs text-emerald-400 mt-1">
                  Sisa: {formatCurrency(budget.remaining)} ({(100 - budget.percentage).toFixed(1)}%)
                </p>
              ) : (
                <p className="text-xs text-red-400 mt-1">
                  Melebihi anggaran: {formatCurrency(Math.abs(budget.remaining))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Monthly Summary Component
function MonthlySummary({ transactions }: { transactions: Transaction[] }) {
  const monthlySummary = useMemo(() => {
    const summary: Record<string, { income: number; expense: number }> = {};
    
    transactions.forEach(t => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!summary[monthKey]) {
        summary[monthKey] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        summary[monthKey].income += t.amount;
      } else {
        summary[monthKey].expense += t.amount;
      }
    });

    return Object.entries(summary)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        return {
          month: monthName,
          ...data,
          balance: data.income - data.expense,
        };
      });
  }, [transactions]);

  const maxValue = useMemo(() => {
    return Math.max(...monthlySummary.flatMap(m => [m.income, m.expense]), 1);
  }, [monthlySummary]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">📅</span>
        Ringkasan Bulanan
      </h3>

      {monthlySummary.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-4xl mb-2">📅</p>
          <p>Belum ada data bulanan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthlySummary.map((month, idx) => (
            <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-white font-medium mb-3">{month.month}</p>
              
              {/* Income Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-emerald-400">Pemasukan</span>
                  <span className="text-emerald-400">{formatCurrency(month.income)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(month.income / maxValue) * 100}%` }}
                  />
                </div>
              </div>

              {/* Expense Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-400">Pengeluaran</span>
                  <span className="text-red-400">{formatCurrency(month.expense)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-800">
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(month.expense / maxValue) * 100}%` }}
                  />
                </div>
              </div>

              {/* Balance */}
              <div className={`text-sm font-medium ${month.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                Selisih: {month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Page Component
export default function KeuanganPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budget' | 'reports'>('overview');
  const isFirstRender = useRef(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

    // Use requestAnimationFrame to defer state updates
    requestAnimationFrame(() => {
      const savedTransactions = localStorage.getItem(STORAGE_KEY);
      const savedBudgets = localStorage.getItem(BUDGET_STORAGE_KEY);
      
      if (savedTransactions) {
        try {
          const parsed = JSON.parse(savedTransactions);
          setTransactions(parsed);
        } catch (error) {
          console.warn('Failed to parse saved transactions from localStorage:', error);
          // Clear corrupted data
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      
      if (savedBudgets) {
        try {
          const parsed = JSON.parse(savedBudgets);
          setBudgets(parsed);
        } catch (error) {
          console.warn('Failed to parse saved budgets from localStorage:', error);
          // Clear corrupted data
          localStorage.removeItem(BUDGET_STORAGE_KEY);
        }
      }
      
      setIsLoaded(true);
    });
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
    }
  }, [budgets, isLoaded]);

  // Handlers
  const handleAddTransaction = useCallback((transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  const handleDeleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleUpdateBudgets = useCallback((newBudgets: Budget[]) => {
    setBudgets(newBudgets);
  }, []);

  // Summary calculations
  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const monthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return { totalIncome, totalExpense, balance, monthIncome, monthExpense };
  }, [transactions]);

  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-slate-300 hover:text-white transition flex items-center gap-2 group">
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">💰</span> Manajemen Keuangan
          </h1>
          <div className="w-[140px]" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Saldo"
            amount={summary.balance}
            icon="💰"
            color="blue"
          />
          <SummaryCard
            title="Total Pemasukan"
            amount={summary.totalIncome}
            icon="📥"
            color="green"
          />
          <SummaryCard
            title="Total Pengeluaran"
            amount={summary.totalExpense}
            icon="📤"
            color="red"
          />
          <SummaryCard
            title="Bulan Ini"
            amount={summary.monthIncome - summary.monthExpense}
            icon="📅"
            color="purple"
            subtitle={`+${formatCurrency(summary.monthIncome)} / -${formatCurrency(summary.monthExpense)}`}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            📋 Transaksi
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'budget'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            💵 Anggaran
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            📈 Laporan
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <TransactionForm onAdd={handleAddTransaction} />
            <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <TransactionForm onAdd={handleAddTransaction} />
            </div>
            <div className="lg:col-span-2">
              <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <BudgetManager budgets={budgets} onUpdate={handleUpdateBudgets} expenses={expenses} />
            <CategoryStats transactions={transactions} type="expense" />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <CategoryStats transactions={transactions} type="income" />
            <CategoryStats transactions={transactions} type="expense" />
            <div className="lg:col-span-2">
              <MonthlySummary transactions={transactions} />
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-sm">💡</span>
            Tips Manajemen Keuangan
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-2xl mb-2">📝</p>
              <h4 className="text-white font-medium mb-1">Catat Setiap Transaksi</h4>
              <p className="text-sm text-slate-400">Disiplin mencatat membantu memahami pola keuangan Anda</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-2xl mb-2">🎯</p>
              <h4 className="text-white font-medium mb-1">Tetapkan Anggaran</h4>
              <p className="text-sm text-slate-400">Batasi pengeluaran per kategori untuk kontrol lebih baik</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-2xl mb-2">💰</p>
              <h4 className="text-white font-medium mb-1">Sisihkan Tabungan</h4>
              <p className="text-sm text-slate-400">Idealnya 20% dari penghasilan untuk tabungan & investasi</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-2xl mb-2">📊</p>
              <h4 className="text-white font-medium mb-1">Review Berkala</h4>
              <p className="text-sm text-slate-400">Evaluasi keuangan setiap bulan untuk perbaikan terus menerus</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
            ℹ️ Informasi
          </h3>
          <p className="text-slate-400 text-sm">
            Data keuangan Anda disimpan secara lokal di browser (localStorage) dan tidak dikirim ke server manapun.
            Data akan tetap tersimpan selama Anda tidak menghapus data browser. Untuk keamanan, disarankan untuk
            melakukan backup data secara berkala.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-700/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>Manajemen Keuangan Pribadi - Untuk Penggunaan Personal</p>
          <p className="mt-1">Built with Next.js, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

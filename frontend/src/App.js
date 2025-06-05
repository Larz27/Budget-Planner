import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const STORAGE_KEY = 'budget_entries';

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  expense: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Other']
};

function App() {
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingId, setEditingId] = useState(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Update category when type changes
  useEffect(() => {
    if (currentEntry.type === 'income') {
      setCurrentEntry(prev => ({ ...prev, category: CATEGORIES.income[0] }));
    } else {
      setCurrentEntry(prev => ({ ...prev, category: CATEGORIES.expense[0] }));
    }
  }, [currentEntry.type]);

  // Calculations
  const calculations = useMemo(() => {
    const totalIncome = entries
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    const totalExpenses = entries
      .filter(entry => entry.type === 'expense')
      .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    const balance = totalIncome - totalExpenses;

    // Monthly data for selected month
    const monthlyEntries = entries.filter(entry => 
      isSameMonth(parseISO(entry.date), parseISO(selectedMonth + '-01'))
    );

    const monthlyIncome = monthlyEntries
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    const monthlyExpenses = monthlyEntries
      .filter(entry => entry.type === 'expense')
      .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    // Category breakdown for expenses
    const categoryBreakdown = monthlyEntries
      .filter(entry => entry.type === 'expense')
      .reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + parseFloat(entry.amount);
        return acc;
      }, {});

    return {
      totalIncome,
      totalExpenses,
      balance,
      monthlyIncome,
      monthlyExpenses,
      monthlyEntries,
      categoryBreakdown
    };
  }, [entries, selectedMonth]);

  // Chart data
  const lineChartData = useMemo(() => {
    // Get last 6 months of data
    const months = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = format(date, 'yyyy-MM');
      months.push(format(date, 'MMM yyyy'));

      const monthEntries = entries.filter(entry => 
        isSameMonth(parseISO(entry.date), date)
      );

      const income = monthEntries
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

      const expenses = monthEntries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

      incomeData.push(income);
      expenseData.push(expenses);
    }

    return {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [entries]);

  const pieChartData = useMemo(() => {
    const categories = Object.keys(calculations.categoryBreakdown);
    const values = Object.values(calculations.categoryBreakdown);

    const colors = [
      'rgba(255, 182, 193, 0.8)', // Light Pink
      'rgba(173, 216, 230, 0.8)', // Light Blue
      'rgba(144, 238, 144, 0.8)', // Light Green
      'rgba(255, 218, 185, 0.8)', // Peach
      'rgba(221, 160, 221, 0.8)', // Plum
      'rgba(255, 255, 224, 0.8)', // Light Yellow
      'rgba(255, 228, 196, 0.8)', // Bisque
      'rgba(230, 230, 250, 0.8)', // Lavender
    ];

    return {
      labels: categories,
      datasets: [
        {
          data: values,
          backgroundColor: colors.slice(0, categories.length),
          borderColor: colors.slice(0, categories.length).map(color => color.replace('0.8', '1')),
          borderWidth: 2,
        },
      ],
    };
  }, [calculations.categoryBreakdown]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentEntry.amount || !currentEntry.category) return;

    const entry = {
      id: editingId || Date.now().toString(),
      ...currentEntry,
      amount: parseFloat(currentEntry.amount).toFixed(2)
    };

    if (editingId) {
      setEntries(prev => prev.map(e => e.id === editingId ? entry : e));
      setEditingId(null);
    } else {
      setEntries(prev => [...prev, entry]);
    }

    setCurrentEntry({
      type: 'expense',
      amount: '',
      category: 'Food',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleEdit = (entry) => {
    setCurrentEntry(entry);
    setEditingId(entry.id);
  };

  const handleDelete = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCurrentEntry({
      type: 'expense',
      amount: '',
      category: 'Food',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">💰 Budget Planner</h1>
          <p className="text-gray-600">Track your income, expenses and stay financially organized</p>
        </div>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Total Income</p>
                <p className="text-3xl font-bold text-green-800">${calculations.totalIncome.toFixed(2)}</p>
              </div>
              <div className="text-green-600 text-4xl">📈</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-100 to-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">Total Expenses</p>
                <p className="text-3xl font-bold text-red-800">${calculations.totalExpenses.toFixed(2)}</p>
              </div>
              <div className="text-red-600 text-4xl">📉</div>
            </div>
          </div>

          <div className={`bg-gradient-to-r ${calculations.balance >= 0 ? 'from-blue-100 to-blue-200' : 'from-orange-100 to-orange-200'} rounded-xl p-6 shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${calculations.balance >= 0 ? 'text-blue-700' : 'text-orange-700'} text-sm font-medium`}>Balance</p>
                <p className={`text-3xl font-bold ${calculations.balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  ${Math.abs(calculations.balance).toFixed(2)}
                </p>
              </div>
              <div className={`${calculations.balance >= 0 ? 'text-blue-600' : 'text-orange-600'} text-4xl`}>
                {calculations.balance >= 0 ? '💎' : '⚠️'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Entry Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingId ? '✏️ Edit Entry' : '➕ Add New Entry'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentEntry(prev => ({ ...prev, type: 'income' }))}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    currentEntry.type === 'income'
                      ? 'bg-green-500 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💰 Income
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentEntry(prev => ({ ...prev, type: 'expense' }))}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    currentEntry.type === 'expense'
                      ? 'bg-red-500 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💸 Expense
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentEntry.amount}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={currentEntry.category}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {CATEGORIES[currentEntry.type].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={currentEntry.description}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={currentEntry.date}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
                >
                  {editingId ? '💾 Update Entry' : '➕ Add Entry'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Recent Entries */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Recent Entries</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {entries.slice(-10).reverse().map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.type}
                      </span>
                      <span className="text-sm text-gray-600">{entry.category}</span>
                    </div>
                    <p className="font-medium text-gray-800">${entry.amount}</p>
                    {entry.description && <p className="text-sm text-gray-600">{entry.description}</p>}
                    <p className="text-xs text-gray-500">{format(parseISO(entry.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-2">📝</p>
                  <p>No entries yet. Add your first transaction!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {entries.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Monthly Trends</h2>
              <div className="h-64">
                <Line 
                  data={lineChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '$' + value;
                          }
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">🥧 Expense Categories</h2>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              {Object.keys(calculations.categoryBreakdown).length > 0 ? (
                <div className="h-64">
                  <Pie 
                    data={pieChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return context.label + ': $' + context.parsed;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-2">📊</p>
                  <p>No expenses for {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Summary */}
        {entries.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📅 Monthly Summary</h2>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">${calculations.monthlyIncome.toFixed(2)}</p>
                <p className="text-gray-600">Monthly Income</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">${calculations.monthlyExpenses.toFixed(2)}</p>
                <p className="text-gray-600">Monthly Expenses</p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${calculations.monthlyIncome - calculations.monthlyExpenses >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  ${Math.abs(calculations.monthlyIncome - calculations.monthlyExpenses).toFixed(2)}
                </p>
                <p className="text-gray-600">
                  {calculations.monthlyIncome - calculations.monthlyExpenses >= 0 ? 'Surplus' : 'Deficit'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
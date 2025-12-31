'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';

// Types
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  createdAt: string;
  tags: string[];
}

type FilterStatus = 'all' | 'todo' | 'in-progress' | 'done';
type SortBy = 'createdAt' | 'dueDate' | 'priority' | 'title';

// Utility functions
const generateId = () => Math.random().toString(36).substring(2, 15);

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const isOverdue = (dueDate: string | null) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

// Priority colors
const priorityColors = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const priorityLabels = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
};

// Status colors
const statusColors = {
  'todo': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'done': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const statusLabels = {
  'todo': 'Belum Dikerjakan',
  'in-progress': 'Sedang Dikerjakan',
  'done': 'Selesai',
};

// Sample tasks
const INITIAL_TASKS: Task[] = [
  {
    id: generateId(),
    title: 'Desain mockup halaman beranda',
    description: 'Membuat desain mockup untuk halaman beranda website portfolio dengan Figma',
    status: 'done',
    priority: 'high',
    dueDate: '2024-12-25',
    createdAt: '2024-12-20T10:00:00',
    tags: ['desain', 'ui/ux'],
  },
  {
    id: generateId(),
    title: 'Implementasi fitur autentikasi',
    description: 'Menambahkan fitur login dan register menggunakan NextAuth.js',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2024-12-30',
    createdAt: '2024-12-22T14:30:00',
    tags: ['backend', 'keamanan'],
  },
  {
    id: generateId(),
    title: 'Menulis dokumentasi API',
    description: 'Membuat dokumentasi lengkap untuk semua endpoint API',
    status: 'todo',
    priority: 'medium',
    dueDate: '2025-01-05',
    createdAt: '2024-12-23T09:00:00',
    tags: ['dokumentasi'],
  },
  {
    id: generateId(),
    title: 'Optimisasi performa database',
    description: 'Menganalisis dan mengoptimasi query database yang lambat',
    status: 'todo',
    priority: 'medium',
    dueDate: '2025-01-10',
    createdAt: '2024-12-24T11:00:00',
    tags: ['backend', 'performa'],
  },
  {
    id: generateId(),
    title: 'Setup CI/CD pipeline',
    description: 'Mengkonfigurasi GitHub Actions untuk otomasi deployment',
    status: 'todo',
    priority: 'low',
    dueDate: null,
    createdAt: '2024-12-25T08:00:00',
    tags: ['devops'],
  },
];

// Task Card Component
function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: { 
  task: Task; 
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';
  
  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border ${overdue ? 'border-red-500/50' : 'border-slate-700/50'} shadow-lg hover:shadow-xl transition-all group`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className={`font-semibold text-white group-hover:text-blue-400 transition ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
          {task.title}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition"
            title="Edit tugas"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition"
            title="Hapus tugas"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityColors[task.priority]}`}>
          {priorityLabels[task.priority]}
        </span>
        {task.tags.map((tag, idx) => (
          <span key={idx} className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded-full">
            #{tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {task.dueDate && (
            <span className={overdue ? 'text-red-400' : ''}>
              📅 {formatDate(task.dueDate)}
              {overdue && ' (Terlambat)'}
            </span>
          )}
        </div>
        
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
          className={`text-xs px-2 py-1 rounded-lg border cursor-pointer transition ${statusColors[task.status]}`}
        >
          <option value="todo">Belum Dikerjakan</option>
          <option value="in-progress">Sedang Dikerjakan</option>
          <option value="done">Selesai</option>
        </select>
      </div>
    </div>
  );
}

// Task Form Modal
function TaskFormModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  
  // Reset form when task changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          tags: task.tags,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          tags: [],
        });
      }
      setTagInput('');
    }
  }, [isOpen, task]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;
    
    const newTask: Task = {
      id: task?.id || generateId(),
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      status: formData.status || 'todo',
      priority: formData.priority || 'medium',
      dueDate: formData.dueDate || null,
      createdAt: task?.createdAt || new Date().toISOString(),
      tags: formData.tags || [],
    };
    
    onSave(newTask);
    onClose();
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      tags: [],
    });
  };
  
  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };
  
  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || [],
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          {task ? '✏️ Edit Tugas' : '➕ Tambah Tugas Baru'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Judul Tugas *</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Masukkan judul tugas"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">Deskripsi</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Deskripsi tugas (opsional)"
              rows={3}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Prioritas</label>
              <select
                value={formData.priority || 'medium'}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white"
              >
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2">Status</label>
              <select
                value={formData.status || 'todo'}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white"
              >
                <option value="todo">Belum Dikerjakan</option>
                <option value="in-progress">Sedang Dikerjakan</option>
                <option value="done">Selesai</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">Tenggat Waktu</label>
            <input
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value || null }))}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">Tag</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Tambah tag"
                className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition text-sm"
              >
                Tambah
              </button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs flex items-center gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-semibold"
            >
              {task ? 'Simpan Perubahan' : 'Tambah Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Component
export default function TaskManagerPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(task => task.status === filterStatus);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'title':
          return a.title.localeCompare(b.title);
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    return result;
  }, [tasks, filterStatus, sortBy, searchQuery]);
  
  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done').length;
    
    return { total, todo, inProgress, done, overdue };
  }, [tasks]);
  
  const handleAddTask = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);
  
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);
  
  const handleDeleteTask = useCallback((id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }, []);
  
  const handleStatusChange = useCallback((id: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }, []);
  
  const handleSaveTask = useCallback((task: Task) => {
    setTasks(prev => {
      const existingIndex = prev.findIndex(t => t.id === task.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = task;
        return updated;
      }
      return [task, ...prev];
    });
  }, []);
  
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
            Kembali ke Portfolio
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">✅</span> Manajer Tugas
          </h1>
          <button
            onClick={handleAddTask}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition text-sm font-semibold shadow-lg"
          >
            + Tugas Baru
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Introduction */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700/50 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">📋</span>
            Tentang Aplikasi Ini
          </h2>
          <p className="text-slate-300 mb-3">
            <strong className="text-white">Manajer Tugas</strong> adalah aplikasi untuk mengelola dan melacak tugas-tugas Anda dengan mudah. 
            Atur prioritas, tenggat waktu, dan status tugas untuk meningkatkan produktivitas Anda.
          </p>
          <ul className="grid md:grid-cols-3 gap-3 text-slate-400 text-sm">
            <li className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
              <span className="text-lg">📝</span> Kelola tugas dengan mudah
            </li>
            <li className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
              <span className="text-lg">🏷️</span> Tag dan kategori tugas
            </li>
            <li className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
              <span className="text-lg">📊</span> Statistik produktivitas
            </li>
          </ul>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-center">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-slate-400">Total Tugas</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-center">
            <p className="text-3xl font-bold text-slate-400">{stats.todo}</p>
            <p className="text-sm text-slate-400">Belum Dikerjakan</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-center">
            <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
            <p className="text-sm text-slate-400">Sedang Dikerjakan</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-center">
            <p className="text-3xl font-bold text-emerald-400">{stats.done}</p>
            <p className="text-sm text-slate-400">Selesai</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 text-center col-span-2 md:col-span-1">
            <p className="text-3xl font-bold text-red-400">{stats.overdue}</p>
            <p className="text-sm text-slate-400">Terlambat</p>
          </div>
        </div>
        
        {/* Filters and Search */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-slate-700/50 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Cari tugas..."
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter by Status */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'todo', 'in-progress', 'done'] as FilterStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                  }`}
                >
                  {status === 'all' ? 'Semua' : statusLabels[status]}
                </button>
              ))}
            </div>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white"
            >
              <option value="createdAt">Urutkan: Terbaru</option>
              <option value="dueDate">Urutkan: Tenggat</option>
              <option value="priority">Urutkan: Prioritas</option>
              <option value="title">Urutkan: Judul</option>
            </select>
          </div>
        </div>
        
        {/* Tasks Grid */}
        {filteredTasks.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50 shadow-xl text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">Tidak ada tugas</h3>
            <p className="text-slate-400 mb-6">
              {searchQuery || filterStatus !== 'all' 
                ? 'Tidak ada tugas yang sesuai dengan filter Anda'
                : 'Mulai dengan menambahkan tugas pertama Anda'}
            </p>
            {filterStatus === 'all' && !searchQuery && (
              <button
                onClick={handleAddTask}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-semibold"
              >
                + Tambah Tugas Pertama
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-700/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400/60 text-sm">
          <p>Manajer Tugas - Tingkatkan Produktivitas Anda</p>
          <p className="mt-1">Dibangun dengan Next.js, TypeScript, dan Tailwind CSS</p>
        </div>
      </footer>
      
      {/* Task Form Modal */}
      <TaskFormModal
        task={editingTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />
    </div>
  );
}

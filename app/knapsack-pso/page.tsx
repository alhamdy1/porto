'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

// Types
interface Item {
  id: number;
  name: string;
  weight: number;
  value: number;
}

interface Particle {
  position: number[]; // Binary array representing item selection
  velocity: number[];
  pBest: number[]; // Personal best position
  pBestFitness: number;
  fitness: number;
}

interface PSOParams {
  numParticles: number;
  maxIterations: number;
  w: number; // Inertia weight
  c1: number; // Cognitive coefficient
  c2: number; // Social coefficient
}

interface OptimizationResult {
  bestPosition: number[];
  bestFitness: number;
  selectedItems: Item[];
  totalWeight: number;
  totalValue: number;
  convergenceHistory: number[];
}

// Default items for demonstration
const DEFAULT_ITEMS: Item[] = [
  { id: 1, name: 'Laptop', weight: 3, value: 1500 },
  { id: 2, name: 'Phone', weight: 0.5, value: 800 },
  { id: 3, name: 'Headphones', weight: 0.3, value: 200 },
  { id: 4, name: 'Camera', weight: 1, value: 1200 },
  { id: 5, name: 'Tablet', weight: 0.8, value: 600 },
  { id: 6, name: 'Watch', weight: 0.1, value: 400 },
  { id: 7, name: 'Power Bank', weight: 0.4, value: 100 },
  { id: 8, name: 'Book', weight: 0.5, value: 50 },
];

// PSO Algorithm Implementation
class PSOKnapsack {
  private items: Item[];
  private capacity: number;
  private params: PSOParams;
  private particles: Particle[];
  private gBest: number[];
  private gBestFitness: number;
  private convergenceHistory: number[];

  constructor(items: Item[], capacity: number, params: PSOParams) {
    this.items = items;
    this.capacity = capacity;
    this.params = params;
    this.particles = [];
    this.gBest = [];
    this.gBestFitness = -Infinity;
    this.convergenceHistory = [];
    this.initializeSwarm();
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private initializeSwarm(): void {
    const n = this.items.length;
    
    for (let i = 0; i < this.params.numParticles; i++) {
      // Initialize random position (binary)
      const position = Array.from({ length: n }, () => Math.random() > 0.5 ? 1 : 0);
      // Initialize random velocity
      const velocity = Array.from({ length: n }, () => Math.random() * 2 - 1);
      
      const fitness = this.calculateFitness(position);
      
      const particle: Particle = {
        position,
        velocity,
        pBest: [...position],
        pBestFitness: fitness,
        fitness,
      };
      
      this.particles.push(particle);
      
      // Update global best
      if (fitness > this.gBestFitness) {
        this.gBestFitness = fitness;
        this.gBest = [...position];
      }
    }
  }

  private calculateFitness(position: number[]): number {
    let totalWeight = 0;
    let totalValue = 0;
    
    for (let i = 0; i < position.length; i++) {
      if (position[i] === 1) {
        totalWeight += this.items[i].weight;
        totalValue += this.items[i].value;
      }
    }
    
    // Penalty for exceeding capacity
    if (totalWeight > this.capacity) {
      // Proportional penalty
      const penalty = (totalWeight - this.capacity) * 1000;
      return totalValue - penalty;
    }
    
    return totalValue;
  }

  private updateParticle(particle: Particle): void {
    const n = this.items.length;
    
    for (let d = 0; d < n; d++) {
      // Update velocity
      const r1 = Math.random();
      const r2 = Math.random();
      
      particle.velocity[d] = 
        this.params.w * particle.velocity[d] +
        this.params.c1 * r1 * (particle.pBest[d] - particle.position[d]) +
        this.params.c2 * r2 * (this.gBest[d] - particle.position[d]);
      
      // Clamp velocity
      particle.velocity[d] = Math.max(-4, Math.min(4, particle.velocity[d]));
      
      // Update position using sigmoid transfer function
      const prob = this.sigmoid(particle.velocity[d]);
      particle.position[d] = Math.random() < prob ? 1 : 0;
    }
    
    // Calculate fitness
    particle.fitness = this.calculateFitness(particle.position);
    
    // Update personal best
    if (particle.fitness > particle.pBestFitness) {
      particle.pBest = [...particle.position];
      particle.pBestFitness = particle.fitness;
    }
    
    // Update global best
    if (particle.fitness > this.gBestFitness) {
      this.gBestFitness = particle.fitness;
      this.gBest = [...particle.position];
    }
  }

  public optimize(): OptimizationResult {
    for (let iter = 0; iter < this.params.maxIterations; iter++) {
      for (const particle of this.particles) {
        this.updateParticle(particle);
      }
      
      this.convergenceHistory.push(this.gBestFitness);
    }
    
    // Get selected items
    const selectedItems = this.items.filter((_, idx) => this.gBest[idx] === 1);
    const totalWeight = selectedItems.reduce((sum, item) => sum + item.weight, 0);
    const totalValue = selectedItems.reduce((sum, item) => sum + item.value, 0);
    
    return {
      bestPosition: this.gBest,
      bestFitness: this.gBestFitness,
      selectedItems,
      totalWeight,
      totalValue,
      convergenceHistory: this.convergenceHistory,
    };
  }
}

// Convergence Chart Component
function ConvergenceChart({ data }: { data: number[] }) {
  // Guard against empty data
  if (data.length === 0) {
    return (
      <div className="w-full h-48 bg-slate-900/50 rounded-xl p-4 flex items-center justify-center border border-slate-700/50">
        <span className="text-slate-400/60">No data to display</span>
      </div>
    );
  }
  
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;
  const divisor = Math.max(data.length - 1, 1);
  
  const points = data.map((value, index) => {
    const x = (index / divisor) * 100;
    const y = 100 - ((value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="w-full h-48 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#4338ca20" strokeWidth="0.2" />
        ))}
        {[0, 25, 50, 75, 100].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#4338ca20" strokeWidth="0.2" />
        ))}
        
        {/* Line chart */}
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke="#818cf8"
            strokeWidth="1"
            points={points}
          />
        )}
        
        {/* Data points */}
        {data.length <= 100 && data.map((value, index) => {
          const x = (index / (data.length - 1 || 1)) * 100;
          const y = 100 - ((value - minValue) / range) * 100;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="0.8"
              fill="#a5b4fc"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-slate-400/60 mt-2">
        <span>Iteration 0</span>
        <span>Iteration {data.length - 1}</span>
      </div>
      <div className="flex justify-between text-xs text-slate-400/60">
        <span>Min: {minValue.toFixed(0)}</span>
        <span>Max: {maxValue.toFixed(0)}</span>
      </div>
    </div>
  );
}

// Main Component
export default function KnapsackPSOPage() {
  // Items state
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [newItem, setNewItem] = useState({ name: '', weight: '', value: '' });
  const [nextItemId, setNextItemId] = useState(DEFAULT_ITEMS.length + 1);
  
  // Knapsack capacity
  const [capacity, setCapacity] = useState(5);
  
  // PSO parameters
  const [psoParams, setPsoParams] = useState<PSOParams>({
    numParticles: 30,
    maxIterations: 100,
    w: 0.7,
    c1: 1.5,
    c2: 1.5,
  });
  
  // Optimization state
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Calculate total stats
  const totalStats = useMemo(() => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    return { totalWeight, totalValue };
  }, [items]);
  
  // Add new item
  const handleAddItem = useCallback(() => {
    if (!newItem.name || !newItem.weight || !newItem.value) return;
    
    const item: Item = {
      id: nextItemId,
      name: newItem.name,
      weight: parseFloat(newItem.weight),
      value: parseFloat(newItem.value),
    };
    
    setNextItemId(prev => prev + 1);
    setItems(prev => [...prev, item]);
    setNewItem({ name: '', weight: '', value: '' });
  }, [newItem, nextItemId]);
  
  // Remove item
  const handleRemoveItem = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  // Run optimization
  const runOptimization = useCallback(() => {
    if (items.length === 0) return;
    
    setIsRunning(true);
    setResult(null);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const pso = new PSOKnapsack(items, capacity, psoParams);
      const optimizationResult = pso.optimize();
      setResult(optimizationResult);
      setIsRunning(false);
    }, 100);
  }, [items, capacity, psoParams]);
  
  // Reset to default items
  const resetToDefault = useCallback(() => {
    setItems(DEFAULT_ITEMS);
    setResult(null);
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
            Back to Portfolio
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🎒</span> Knapsack Problem - PSO Solver
          </h1>
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl transition text-sm border border-slate-700/50"
          >
            Reset Items
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Introduction */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700/50 shadow-xl">
          <h2 className="text-xl font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">📚</span>
            About This Project
          </h2>
          <p className="text-slate-300 mb-3">
            The <strong className="text-slate-300">0/1 Knapsack Problem</strong> is a classic combinatorial optimization problem. 
            Given a set of items with weights and values, the goal is to determine which items to include 
            in a knapsack of limited capacity to maximize the total value.
          </p>
          <p className="text-slate-300">
            <strong className="text-slate-300">Particle Swarm Optimization (PSO)</strong> is a metaheuristic algorithm inspired by 
            the social behavior of birds flocking or fish schooling. Particles &ldquo;fly&rdquo; through the solution 
            space, guided by their own best-known position and the swarm&rsquo;s best-known position.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Table */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">📦</span>
                  Items ({items.length})
                </h2>
                <div className="text-sm text-slate-400">
                  Total Weight: {totalStats.totalWeight.toFixed(1)} kg | 
                  Total Value: ${totalStats.totalValue.toFixed(0)}
                </div>
              </div>
              
              {/* Add Item Form */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  value={newItem.weight}
                  onChange={(e) => setNewItem(prev => ({ ...prev, weight: e.target.value }))}
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  step="0.1"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Value ($)"
                  value={newItem.value}
                  onChange={(e) => setNewItem(prev => ({ ...prev, value: e.target.value }))}
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  min="0"
                />
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-sm font-medium shadow-lg shadow-lg"
                >
                  Add Item
                </button>
              </div>
              
              {/* Items List */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/50">
                      <th className="py-2 text-left">#</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-right">Weight (kg)</th>
                      <th className="py-2 text-right">Value ($)</th>
                      <th className="py-2 text-right">Ratio ($/kg)</th>
                      <th className="py-2 text-center">Selected</th>
                      <th className="py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const isSelected = result?.bestPosition[index] === 1;
                      return (
                        <tr 
                          key={item.id} 
                          className={`border-b border-indigo-500/10 ${isSelected ? 'bg-emerald-500/20' : ''}`}
                        >
                          <td className="py-2 text-slate-400/60">{index + 1}</td>
                          <td className="py-2 text-slate-300">{item.name}</td>
                          <td className="py-2 text-right text-slate-300">{item.weight.toFixed(1)}</td>
                          <td className="py-2 text-right text-slate-300">${item.value.toFixed(0)}</td>
                          <td className="py-2 text-right text-slate-400/60">
                            {(item.value / item.weight).toFixed(0)}
                          </td>
                          <td className="py-2 text-center">
                            {result && (
                              isSelected ? (
                                <span className="text-emerald-400">✓</span>
                              ) : (
                                <span className="text-slate-500">✗</span>
                              )
                            )}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-400 hover:text-red-400 transition"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Results */}
            {result && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">📊</span>
                  Optimization Results
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Summary */}
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                      <h3 className="text-sm text-slate-400 mb-2">Best Solution</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-2xl font-bold text-emerald-400">${result.totalValue.toFixed(0)}</p>
                          <p className="text-xs text-slate-400/60">Total Value</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-400">{result.totalWeight.toFixed(2)} kg</p>
                          <p className="text-xs text-slate-400/60">Total Weight</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-400/60 mb-1">
                          <span>Capacity Used</span>
                          <span>{((result.totalWeight / capacity) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-900/50 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (result.totalWeight / capacity) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                      <h3 className="text-sm text-slate-400 mb-2">Selected Items ({result.selectedItems.length})</h3>
                      <div className="space-y-1">
                        {result.selectedItems.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-300">{item.name}</span>
                            <span className="text-slate-400/60">{item.weight}kg / ${item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Convergence Chart */}
                  <div>
                    <h3 className="text-sm text-slate-400 mb-2">Convergence History</h3>
                    <ConvergenceChart data={result.convergenceHistory} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Parameters */}
          <div className="space-y-6">
            {/* Knapsack Capacity */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">🎒</span>
                Knapsack Capacity
              </h2>
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Capacity (kg): {capacity}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={capacity}
                  onChange={(e) => setCapacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500/50 mt-1">
                  <span>1 kg</span>
                  <span>20 kg</span>
                </div>
              </div>
            </div>
            
            {/* PSO Parameters */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-sm">⚙️</span>
                PSO Parameters
              </h2>
              
              <div className="space-y-4">
                {/* Number of Particles */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Particles: {psoParams.numParticles}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={psoParams.numParticles}
                    onChange={(e) => setPsoParams(prev => ({ 
                      ...prev, 
                      numParticles: parseInt(e.target.value) 
                    }))}
                    className="w-full accent-blue-500"
                  />
                </div>
                
                {/* Max Iterations */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Iterations: {psoParams.maxIterations}
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={psoParams.maxIterations}
                    onChange={(e) => setPsoParams(prev => ({ 
                      ...prev, 
                      maxIterations: parseInt(e.target.value) 
                    }))}
                    className="w-full accent-blue-500"
                  />
                </div>
                
                {/* Inertia Weight */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Inertia (w): {psoParams.w.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={psoParams.w}
                    onChange={(e) => setPsoParams(prev => ({ 
                      ...prev, 
                      w: parseFloat(e.target.value) 
                    }))}
                    className="w-full accent-blue-500"
                  />
                </div>
                
                {/* Cognitive Coefficient */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Cognitive (c1): {psoParams.c1.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={psoParams.c1}
                    onChange={(e) => setPsoParams(prev => ({ 
                      ...prev, 
                      c1: parseFloat(e.target.value) 
                    }))}
                    className="w-full accent-blue-500"
                  />
                </div>
                
                {/* Social Coefficient */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Social (c2): {psoParams.c2.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={psoParams.c2}
                    onChange={(e) => setPsoParams(prev => ({ 
                      ...prev, 
                      c2: parseFloat(e.target.value) 
                    }))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
              
              {/* Parameter Info */}
              <div className="mt-4 p-3 bg-slate-900/50 rounded-xl text-xs text-slate-400 border border-slate-700/50">
                <p><strong className="text-slate-300">w:</strong> Controls exploration vs exploitation</p>
                <p><strong className="text-slate-300">c1:</strong> How much to trust personal best</p>
                <p><strong className="text-slate-300">c2:</strong> How much to trust global best</p>
              </div>
            </div>
            
            {/* Run Button */}
            <button
              onClick={runOptimization}
              disabled={isRunning || items.length === 0}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition shadow-xl
                ${isRunning || items.length === 0
                  ? 'bg-slate-800/50 text-slate-500/50 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg '
                }
              `}
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Optimizing...
                </span>
              ) : (
                '🚀 Run PSO Optimization'
              )}
            </button>
            
            {/* Algorithm Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-sm">📖</span>
                Algorithm
              </h2>
              <div className="space-y-2 text-sm text-slate-300">
                <p>1. Initialize swarm with random positions</p>
                <p>2. Evaluate fitness (value - penalty)</p>
                <p>3. Update personal and global best</p>
                <p>4. Update velocity using PSO equation</p>
                <p>5. Update position using sigmoid transfer</p>
                <p>6. Repeat until max iterations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-700/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400/60 text-sm">
          <p>Knapsack Problem Solver using Particle Swarm Optimization (PSO)</p>
          <p className="mt-1">Built with Next.js, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

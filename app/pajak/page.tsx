'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

// Tax brackets for PPh 21 (Income Tax) - 2024 rates
const PPH_21_BRACKETS = [
  { min: 0, max: 60_000_000, rate: 0.05 },
  { min: 60_000_000, max: 250_000_000, rate: 0.15 },
  { min: 250_000_000, max: 500_000_000, rate: 0.25 },
  { min: 500_000_000, max: 5_000_000_000, rate: 0.30 },
  { min: 5_000_000_000, max: Infinity, rate: 0.35 },
];

// PTKP (Penghasilan Tidak Kena Pajak) 2024
const PTKP_VALUES = {
  TK0: 54_000_000, // Tidak Kawin, tanpa tanggungan
  TK1: 58_500_000, // Tidak Kawin, 1 tanggungan
  TK2: 63_000_000, // Tidak Kawin, 2 tanggungan
  TK3: 67_500_000, // Tidak Kawin, 3 tanggungan
  K0: 58_500_000,  // Kawin, tanpa tanggungan
  K1: 63_000_000,  // Kawin, 1 tanggungan
  K2: 67_500_000,  // Kawin, 2 tanggungan
  K3: 72_000_000,  // Kawin, 3 tanggungan
  KI0: 112_500_000, // Kawin + penghasilan istri digabung, tanpa tanggungan
  KI1: 117_000_000, // Kawin + penghasilan istri digabung, 1 tanggungan
  KI2: 121_500_000, // Kawin + penghasilan istri digabung, 2 tanggungan
  KI3: 126_000_000, // Kawin + penghasilan istri digabung, 3 tanggungan
};

type PTKPStatus = keyof typeof PTKP_VALUES;

interface TaxCalculationResult {
  grossIncome: number;
  ptkp: number;
  taxableIncome: number;
  taxAmount: number;
  taxBrackets: Array<{
    bracket: string;
    amount: number;
    rate: number;
    tax: number;
  }>;
  effectiveRate: number;
}

// Format currency to Indonesian Rupiah
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format number with thousand separators
function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Parse number from formatted string
function parseFormattedNumber(str: string): number {
  return parseInt(str.replace(/\D/g, '')) || 0;
}

// Calculate PPh 21 (Income Tax)
function calculatePPh21(annualIncome: number, ptkpStatus: PTKPStatus): TaxCalculationResult {
  const ptkp = PTKP_VALUES[ptkpStatus];
  const taxableIncome = Math.max(0, annualIncome - ptkp);
  
  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const taxBrackets: TaxCalculationResult['taxBrackets'] = [];
  
  for (const bracket of PPH_21_BRACKETS) {
    if (remainingIncome <= 0) break;
    
    const bracketSize = bracket.max === Infinity 
      ? remainingIncome 
      : Math.min(remainingIncome, bracket.max - bracket.min);
    
    const taxInBracket = bracketSize * bracket.rate;
    totalTax += taxInBracket;
    
    if (bracketSize > 0) {
      taxBrackets.push({
        bracket: bracket.max === Infinity 
          ? `> ${formatCurrency(bracket.min)}` 
          : `${formatCurrency(bracket.min)} - ${formatCurrency(bracket.max)}`,
        amount: bracketSize,
        rate: bracket.rate * 100,
        tax: taxInBracket,
      });
    }
    
    remainingIncome -= bracketSize;
  }
  
  return {
    grossIncome: annualIncome,
    ptkp,
    taxableIncome,
    taxAmount: totalTax,
    taxBrackets,
    effectiveRate: annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0,
  };
}

// Calculate PPN (VAT)
function calculatePPN(amount: number, rate: number = 12): { ppnAmount: number; totalWithPPN: number; priceBeforePPN: number } {
  const ppnAmount = amount * (rate / 100);
  return {
    ppnAmount,
    totalWithPPN: amount + ppnAmount,
    priceBeforePPN: amount / (1 + rate / 100),
  };
}

// Tax Information Section
function TaxInfoSection() {
  return (
    <div className="bg-slate-700/50 rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        📚 Informasi Perpajakan Indonesia
      </h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* PPh 21 Info */}
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
            💼 PPh 21 (Pajak Penghasilan)
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            Pajak yang dikenakan atas penghasilan berupa gaji, upah, honorarium, tunjangan, 
            dan pembayaran lain yang diterima oleh Wajib Pajak orang pribadi dalam negeri.
          </p>
          <div className="bg-slate-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-white mb-2">Tarif PPh 21 (2024):</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• 5% untuk PKP s.d Rp60 juta</li>
              <li>• 15% untuk PKP Rp60 juta - Rp250 juta</li>
              <li>• 25% untuk PKP Rp250 juta - Rp500 juta</li>
              <li>• 30% untuk PKP Rp500 juta - Rp5 miliar</li>
              <li>• 35% untuk PKP di atas Rp5 miliar</li>
            </ul>
          </div>
        </div>
        
        {/* PPN Info */}
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            🛒 PPN (Pajak Pertambahan Nilai)
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            Pajak yang dikenakan atas setiap pertambahan nilai dari barang atau jasa 
            dalam peredarannya dari produsen ke konsumen.
          </p>
          <div className="bg-slate-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-white mb-2">Tarif PPN:</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• 12% (tarif umum sejak 1 Januari 2025)</li>
              <li>• 11% (tarif sebelumnya, April 2022 - Desember 2024)</li>
              <li>• 0% untuk ekspor BKP/JKP</li>
            </ul>
          </div>
        </div>
        
        {/* PTKP Info */}
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            👤 PTKP (Penghasilan Tidak Kena Pajak)
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            Jumlah penghasilan yang tidak dikenakan pajak karena dianggap untuk 
            memenuhi kebutuhan dasar wajib pajak dan tanggungannya.
          </p>
          <div className="bg-slate-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-white mb-2">PTKP 2024:</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• TK/0: Rp54.000.000/tahun</li>
              <li>• K/0: Rp58.500.000/tahun</li>
              <li>• Tambahan tanggungan: Rp4.500.000/orang</li>
              <li>• Maksimal 3 tanggungan</li>
            </ul>
          </div>
        </div>
        
        {/* PPh Final Info */}
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
            🏢 PPh Final UMKM
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            Pajak penghasilan yang bersifat final untuk usaha mikro, kecil, dan menengah 
            dengan peredaran bruto tertentu.
          </p>
          <div className="bg-slate-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-white mb-2">Ketentuan:</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Tarif: 0,5% dari omzet</li>
              <li>• Untuk omzet s.d Rp4,8 miliar/tahun</li>
              <li>• Berlaku untuk WP OP & Badan</li>
              <li>• Bebas pajak jika omzet ≤ Rp500 juta/tahun (OP)</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Important Dates */}
      <div className="mt-6 bg-slate-800 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
          📅 Batas Waktu Pelaporan Pajak
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700 rounded-lg p-3 text-center">
            <p className="text-white font-semibold">SPT PPh 21</p>
            <p className="text-slate-300 text-sm">Tanggal 20 bulan berikutnya</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3 text-center">
            <p className="text-white font-semibold">SPT Tahunan OP</p>
            <p className="text-slate-300 text-sm">31 Maret</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3 text-center">
            <p className="text-white font-semibold">SPT Tahunan Badan</p>
            <p className="text-slate-300 text-sm">30 April</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3 text-center">
            <p className="text-white font-semibold">SPT Masa PPN</p>
            <p className="text-slate-300 text-sm">Akhir bulan berikutnya</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// PPh 21 Calculator Component
function PPh21Calculator() {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [ptkpStatus, setPtkpStatus] = useState<PTKPStatus>('TK0');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  
  const handleCalculate = useCallback(() => {
    const monthly = parseFormattedNumber(monthlyIncome);
    const annual = monthly * 12;
    const calculation = calculatePPh21(annual, ptkpStatus);
    setResult(calculation);
  }, [monthlyIncome, ptkpStatus]);
  
  const handleReset = useCallback(() => {
    setMonthlyIncome('');
    setPtkpStatus('TK0');
    setResult(null);
  }, []);
  
  const ptkpOptions = useMemo(() => [
    { value: 'TK0', label: 'TK/0 - Tidak Kawin, 0 Tanggungan' },
    { value: 'TK1', label: 'TK/1 - Tidak Kawin, 1 Tanggungan' },
    { value: 'TK2', label: 'TK/2 - Tidak Kawin, 2 Tanggungan' },
    { value: 'TK3', label: 'TK/3 - Tidak Kawin, 3 Tanggungan' },
    { value: 'K0', label: 'K/0 - Kawin, 0 Tanggungan' },
    { value: 'K1', label: 'K/1 - Kawin, 1 Tanggungan' },
    { value: 'K2', label: 'K/2 - Kawin, 2 Tanggungan' },
    { value: 'K3', label: 'K/3 - Kawin, 3 Tanggungan' },
    { value: 'KI0', label: 'K/I/0 - Kawin + Istri Bekerja, 0 Tanggungan' },
    { value: 'KI1', label: 'K/I/1 - Kawin + Istri Bekerja, 1 Tanggungan' },
    { value: 'KI2', label: 'K/I/2 - Kawin + Istri Bekerja, 2 Tanggungan' },
    { value: 'KI3', label: 'K/I/3 - Kawin + Istri Bekerja, 3 Tanggungan' },
  ], []);
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        💼 Kalkulator PPh 21
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Penghasilan Bruto per Bulan (Rp)
            </label>
            <input
              type="text"
              value={monthlyIncome}
              onChange={(e) => {
                const value = parseFormattedNumber(e.target.value);
                setMonthlyIncome(value > 0 ? formatNumber(value) : '');
              }}
              placeholder="Contoh: 10.000.000"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Status PTKP
            </label>
            <select
              value={ptkpStatus}
              onChange={(e) => setPtkpStatus(e.target.value as PTKPStatus)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
            >
              {ptkpOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleCalculate}
              disabled={!monthlyIncome}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
            >
              Hitung Pajak
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition"
            >
              Reset
            </button>
          </div>
        </div>
        
        {/* Result */}
        <div className="bg-slate-800 rounded-lg p-4">
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Penghasilan Bruto/Tahun</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(result.grossIncome)}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400">PTKP</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(result.ptkp)}</p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400">PKP (Penghasilan Kena Pajak)</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(result.taxableIncome)}</p>
                </div>
                <div className="bg-green-900/50 rounded-lg p-3 border border-green-500">
                  <p className="text-xs text-green-300">PPh 21/Tahun</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(result.taxAmount)}</p>
                </div>
              </div>
              
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300">PPh 21/Bulan:</span>
                  <span className="text-xl font-bold text-blue-400">{formatCurrency(result.taxAmount / 12)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-blue-300">Tarif Efektif:</span>
                  <span className="text-lg font-bold text-blue-400">{result.effectiveRate.toFixed(2)}%</span>
                </div>
              </div>
              
              {result.taxBrackets.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Rincian per Bracket:</p>
                  <div className="space-y-1 text-xs">
                    {result.taxBrackets.map((bracket, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300 bg-slate-700 p-2 rounded">
                        <span>{bracket.rate}%</span>
                        <span>{formatCurrency(bracket.amount)}</span>
                        <span className="text-green-400">= {formatCurrency(bracket.tax)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-4xl mb-2">📊</p>
                <p>Masukkan data untuk melihat hasil perhitungan</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// PPN Calculator Component
function PPNCalculator() {
  const [amount, setAmount] = useState('');
  const [ppnRate, setPpnRate] = useState(12);
  const [calculationType, setCalculationType] = useState<'add' | 'extract'>('add');
  
  const result = useMemo(() => {
    const value = parseFormattedNumber(amount);
    if (value <= 0) return null;
    
    if (calculationType === 'add') {
      const ppn = calculatePPN(value, ppnRate);
      return {
        baseAmount: value,
        ppnAmount: ppn.ppnAmount,
        totalAmount: ppn.totalWithPPN,
      };
    } else {
      // Extract PPN from total
      const baseAmount = value / (1 + ppnRate / 100);
      const ppnAmount = value - baseAmount;
      return {
        baseAmount,
        ppnAmount,
        totalAmount: value,
      };
    }
  }, [amount, ppnRate, calculationType]);
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        🛒 Kalkulator PPN
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Jenis Perhitungan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCalculationType('add')}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  calculationType === 'add'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                Tambah PPN
              </button>
              <button
                onClick={() => setCalculationType('extract')}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  calculationType === 'extract'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                Pisahkan PPN
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              {calculationType === 'add' ? 'Harga Sebelum PPN (Rp)' : 'Harga Termasuk PPN (Rp)'}
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const value = parseFormattedNumber(e.target.value);
                setAmount(value > 0 ? formatNumber(value) : '');
              }}
              placeholder="Contoh: 1.000.000"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Tarif PPN: {ppnRate}%
            </label>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={ppnRate}
              onChange={(e) => setPpnRate(parseFloat(e.target.value))}
              className="w-full accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span>
              <span className="text-green-400">12% (saat ini)</span>
              <span>15%</span>
            </div>
          </div>
        </div>
        
        {/* Result */}
        <div className="bg-slate-800 rounded-lg p-4">
          {result ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-400">Harga Dasar (DPP)</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(result.baseAmount)}</p>
                </div>
                
                <div className="bg-green-900/30 rounded-lg p-4 border border-green-500">
                  <p className="text-sm text-green-300">PPN ({ppnRate}%)</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(result.ppnAmount)}</p>
                </div>
                
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500">
                  <p className="text-sm text-blue-300">Total (DPP + PPN)</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(result.totalAmount)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-4xl mb-2">🧮</p>
                <p>Masukkan nominal untuk menghitung PPN</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// PPh Final UMKM Calculator Component
function PPHFinalCalculator() {
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [entityType, setEntityType] = useState<'individual' | 'corporate'>('individual');
  
  const result = useMemo(() => {
    const monthly = parseFormattedNumber(monthlyRevenue);
    if (monthly <= 0) return null;
    
    const annualRevenue = monthly * 12;
    const threshold = 4_800_000_000; // Rp4.8 billion
    const exemptThreshold = entityType === 'individual' ? 500_000_000 : 0; // Rp500 million for individuals
    
    const isEligible = annualRevenue <= threshold;
    const taxRate = 0.005; // 0.5%
    
    // Calculate taxable revenue (above exempt threshold for individuals)
    const taxableRevenue = entityType === 'individual' 
      ? Math.max(0, annualRevenue - exemptThreshold)
      : annualRevenue;
    
    const annualTax = isEligible ? taxableRevenue * taxRate : 0;
    const monthlyTax = annualTax / 12;
    
    return {
      monthlyRevenue: monthly,
      annualRevenue,
      isEligible,
      exemptAmount: entityType === 'individual' ? Math.min(exemptThreshold, annualRevenue) : 0,
      taxableRevenue,
      annualTax,
      monthlyTax,
      effectiveRate: annualRevenue > 0 ? (annualTax / annualRevenue) * 100 : 0,
    };
  }, [monthlyRevenue, entityType]);
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        🏢 Kalkulator PPh Final UMKM (0,5%)
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Jenis Wajib Pajak
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEntityType('individual')}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  entityType === 'individual'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                Orang Pribadi
              </button>
              <button
                onClick={() => setEntityType('corporate')}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  entityType === 'corporate'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                Badan Usaha
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Omzet per Bulan (Rp)
            </label>
            <input
              type="text"
              value={monthlyRevenue}
              onChange={(e) => {
                const value = parseFormattedNumber(e.target.value);
                setMonthlyRevenue(value > 0 ? formatNumber(value) : '');
              }}
              placeholder="Contoh: 50.000.000"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400"
            />
          </div>
          
          {entityType === 'individual' && (
            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 text-sm text-green-300">
              💡 Orang Pribadi dengan omzet ≤ Rp500 juta/tahun bebas PPh Final!
            </div>
          )}
        </div>
        
        {/* Result */}
        <div className="bg-slate-800 rounded-lg p-4">
          {result ? (
            <div className="space-y-4">
              {!result.isEligible ? (
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-center">
                  <p className="text-red-400 font-semibold">❌ Tidak Memenuhi Syarat</p>
                  <p className="text-sm text-red-300 mt-2">
                    Omzet tahunan melebihi Rp4,8 miliar. Gunakan tarif PPh reguler.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Omzet/Tahun</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(result.annualRevenue)}</p>
                    </div>
                    {result.exemptAmount > 0 && (
                      <div className="bg-green-900/30 rounded-lg p-3 border border-green-500">
                        <p className="text-xs text-green-300">Bebas Pajak</p>
                        <p className="text-lg font-bold text-green-400">{formatCurrency(result.exemptAmount)}</p>
                      </div>
                    )}
                    <div className="bg-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Omzet Kena Pajak</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(result.taxableRevenue)}</p>
                    </div>
                    <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-500">
                      <p className="text-xs text-orange-300">PPh Final/Tahun</p>
                      <p className="text-lg font-bold text-orange-400">{formatCurrency(result.annualTax)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300">PPh Final/Bulan:</span>
                      <span className="text-xl font-bold text-blue-400">{formatCurrency(result.monthlyTax)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-blue-300">Tarif Efektif:</span>
                      <span className="text-lg font-bold text-blue-400">{result.effectiveRate.toFixed(2)}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-4xl mb-2">📈</p>
                <p>Masukkan omzet untuk menghitung pajak</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function PajakCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'pph21' | 'ppn' | 'umkm'>('pph21');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-white hover:text-blue-400 transition flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white">🧾 Kalkulator Pajak Indonesia</h1>
          <div className="w-[140px]" /> {/* Spacer for centering */}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tax Information Section */}
        <TaxInfoSection />
        
        {/* Calculator Section */}
        <div className="bg-slate-700/50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            🧮 Kalkulator Pajak
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('pph21')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'pph21'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              💼 PPh 21
            </button>
            <button
              onClick={() => setActiveTab('ppn')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'ppn'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🛒 PPN
            </button>
            <button
              onClick={() => setActiveTab('umkm')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'umkm'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🏢 PPh Final UMKM
            </button>
          </div>
          
          {/* Calculator Content */}
          {activeTab === 'pph21' && <PPh21Calculator />}
          {activeTab === 'ppn' && <PPNCalculator />}
          {activeTab === 'umkm' && <PPHFinalCalculator />}
        </div>
        
        {/* Disclaimer */}
        <div className="mt-6 bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4">
          <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
            ⚠️ Disclaimer
          </h3>
          <p className="text-yellow-200/80 text-sm">
            Kalkulator ini hanya untuk tujuan estimasi dan edukasi. Hasil perhitungan mungkin berbeda 
            dengan perhitungan resmi. Untuk perhitungan pajak yang akurat, silakan konsultasikan dengan 
            konsultan pajak atau gunakan aplikasi resmi Direktorat Jenderal Pajak (DJP Online).
          </p>
        </div>
        
        {/* Useful Links */}
        <div className="mt-6 bg-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🔗 Link Berguna
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="https://djponline.pajak.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 rounded-lg p-4 text-center transition group"
            >
              <p className="text-blue-400 font-semibold group-hover:text-blue-300">DJP Online</p>
              <p className="text-xs text-slate-400 mt-1">Portal Pajak Resmi</p>
            </a>
            <a
              href="https://www.pajak.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 rounded-lg p-4 text-center transition group"
            >
              <p className="text-blue-400 font-semibold group-hover:text-blue-300">Pajak.go.id</p>
              <p className="text-xs text-slate-400 mt-1">Website Resmi DJP</p>
            </a>
            <a
              href="https://klikpajak.id"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 rounded-lg p-4 text-center transition group"
            >
              <p className="text-blue-400 font-semibold group-hover:text-blue-300">Klik Pajak</p>
              <p className="text-xs text-slate-400 mt-1">E-Faktur & E-Billing</p>
            </a>
            <a
              href="https://www.online-pajak.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 rounded-lg p-4 text-center transition group"
            >
              <p className="text-blue-400 font-semibold group-hover:text-blue-300">Online Pajak</p>
              <p className="text-xs text-slate-400 mt-1">Aplikasi Pajak Online</p>
            </a>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>Kalkulator Pajak Indonesia - Untuk Tujuan Edukasi</p>
          <p className="mt-1">Built with Next.js, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Pill, 
  Plus, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  TrendingDown, 
  Package, 
  Minus, 
  PlusCircle, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { Medicine } from '../types';

export default function MedicinesView() {
  const { 
    medicines, 
    activeTenantId, 
    addMedicine, 
    updateMedicine, 
    deleteMedicine, 
    consumeMedicine,
    alertConfig
  } = useHomeCareStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'near_expiry'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState<number>(30);
  const [minQuantity, setMinQuantity] = useState<number>(5);

  // Quick consumption states
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [consumeQty, setConsumeQty] = useState<number>(1);
  const [consumeSuccess, setConsumeSuccess] = useState<string | null>(null);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  // Quick increase states
  const [increasingId, setIncreasingId] = useState<string | null>(null);
  const [increaseQty, setIncreaseQty] = useState<number>(10);

  // Filter medicines for current tenant
  const tenantMedicines = medicines.filter(m => m.tenantId === activeTenantId);

  const getMedicineStatus = (m: Medicine) => {
    const today = new Date();
    const expDate = new Date(m.expiryDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const warningDays = alertConfig?.expiryWarningDays || 30;

    if (diffDays < 0) {
      return { label: 'Vencido', color: 'bg-rose-50 border-rose-200 text-rose-700', severity: 'critical' };
    }
    if (diffDays <= warningDays) {
      return { label: `Vence em ${diffDays} dias`, color: 'bg-orange-50 border-orange-200 text-orange-700', severity: 'warning' };
    }
    if (m.quantity <= m.minQuantity) {
      return { label: 'Estoque Baixo', color: 'bg-amber-50 border-amber-200 text-amber-700', severity: 'warning' };
    }
    return { label: 'Em Estoque', color: 'bg-emerald-50 border-emerald-100 text-emerald-700', severity: 'normal' };
  };

  const filteredMedicines = tenantMedicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const today = new Date();
    const expDate = new Date(m.expiryDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const warningDays = alertConfig?.expiryWarningDays || 30;

    if (!matchesSearch) return false;

    if (filterType === 'low_stock') {
      return m.quantity <= m.minQuantity;
    }
    if (filterType === 'near_expiry') {
      return diffDays <= warningDays;
    }
    return true;
  });

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage || !manufacturer || !expiryDate) return;

    addMedicine({
      name,
      dosage,
      manufacturer,
      expiryDate,
      quantity,
      minQuantity
    });

    // Reset Form
    setName('');
    setDosage('');
    setManufacturer('');
    setExpiryDate('');
    setQuantity(30);
    setMinQuantity(5);
    setShowAddModal(false);
  };

  const handleConsume = (id: string) => {
    setConsumeSuccess(null);
    setConsumeError(null);
    
    if (consumeQty <= 0) {
      setConsumeError("Quantidade inválida.");
      return;
    }

    const success = consumeMedicine(id, consumeQty);
    if (success) {
      setConsumeSuccess("Estoque reduzido com sucesso!");
      setTimeout(() => {
        setConsumeSuccess(null);
        setConsumingId(null);
        setConsumeQty(1);
      }, 1500);
    } else {
      setConsumeError("Saldo insuficiente em estoque.");
    }
  };

  const handleIncrease = (id: string) => {
    const med = medicines.find(m => m.id === id);
    if (med) {
      updateMedicine(id, { quantity: med.quantity + increaseQty });
      setIncreasingId(null);
      setIncreaseQty(10);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Estoque de Medicamentos</h2>
          <p className="text-slate-500 text-sm mt-1">
            Controle de farmácia centralizada, níveis críticos de estoque, lotes e datas de validade de insumos para atendimentos domiciliares.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-blue-100"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Medicamento</span>
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Medicamentos Totais</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{tenantMedicines.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Críticos / Estoque Baixo</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {tenantMedicines.filter(m => m.quantity <= m.minQuantity).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Próximos do Vencimento</span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {tenantMedicines.filter(m => {
                const diffTime = new Date(m.expiryDate).getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= (alertConfig?.expiryWarningDays || 30);
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou fabricante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs pl-9 pr-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({tenantMedicines.length})
          </button>
          <button
            onClick={() => setFilterType('low_stock')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterType === 'low_stock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Estoque Baixo ({tenantMedicines.filter(m => m.quantity <= m.minQuantity).length})
          </button>
          <button
            onClick={() => setFilterType('near_expiry')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filterType === 'near_expiry' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Próx. Vencimento ({tenantMedicines.filter(m => {
              const diffTime = new Date(m.expiryDate).getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= (alertConfig?.expiryWarningDays || 30);
            }).length})
          </button>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Medicamento</th>
                <th className="py-3.5 px-6">Fabricante</th>
                <th className="py-3.5 px-6">Data de Validade</th>
                <th className="py-3.5 px-6">Status Comercial</th>
                <th className="py-3.5 px-6 text-center">Quantidade</th>
                <th className="py-3.5 px-6 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMedicines.length > 0 ? (
                filteredMedicines.map((m) => {
                  const status = getMedicineStatus(m);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            status.severity === 'critical' ? 'bg-rose-50 text-rose-500' :
                            status.severity === 'warning' ? 'bg-amber-50 text-amber-500' :
                            'bg-blue-50 text-blue-500'
                          }`}>
                            <Pill className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-sm">{m.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Dosagem: {m.dosage}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">{m.manufacturer}</td>
                      <td className="py-4 px-6 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.expiryDate}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-sm font-bold ${
                            m.quantity <= m.minQuantity ? 'text-amber-600' : 'text-slate-800'
                          }`}>
                            {m.quantity} un
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">Mínimo: {m.minQuantity} un</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Decrease Stock button */}
                          {consumingId === m.id ? (
                            <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 animate-fade-in text-left">
                              <input
                                type="number"
                                min={1}
                                max={m.quantity}
                                value={consumeQty}
                                onChange={(e) => setConsumeQty(parseInt(e.target.value) || 1)}
                                className="w-12 bg-white border border-slate-200 rounded text-center text-xs font-bold py-0.5"
                              />
                              <button
                                onClick={() => handleConsume(m.id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded"
                              >
                                Confirmar Baixa
                              </button>
                              <button
                                onClick={() => { setConsumingId(null); setConsumeError(null); }}
                                className="text-slate-400 hover:text-slate-700 text-[10px]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setConsumingId(m.id);
                                setIncreasingId(null);
                                setConsumeQty(1);
                              }}
                              className="px-2.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                              <span>Dar Baixa</span>
                            </button>
                          )}

                          {/* Increase Stock button */}
                          {increasingId === m.id ? (
                            <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 animate-fade-in">
                              <input
                                type="number"
                                min={1}
                                value={increaseQty}
                                onChange={(e) => setIncreaseQty(parseInt(e.target.value) || 1)}
                                className="w-12 bg-white border border-slate-200 rounded text-center text-xs font-bold py-0.5"
                              />
                              <button
                                onClick={() => handleIncrease(m.id)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded"
                              >
                                Adicionar
                              </button>
                              <button
                                onClick={() => setIncreasingId(null)}
                                className="text-slate-400 hover:text-slate-700 text-[10px]"
                              >
                                Fechar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setIncreasingId(m.id);
                                setConsumingId(null);
                                setIncreaseQty(10);
                              }}
                              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Abastecer</span>
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm("Deseja mesmo remover este medicamento?")) {
                                deleteMedicine(m.id);
                              }
                            }}
                            className="p-1.5 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <Pill className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p>Nenhum medicamento encontrado para os filtros selecionados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlay status for feedback */}
      {(consumeSuccess || consumeError) && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-2.5 ${
            consumeSuccess ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            {consumeSuccess ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-rose-500" />}
            <span className="text-xs font-bold">{consumeSuccess || consumeError}</span>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Cadastrar Novo Medicamento</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddMedicine} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Medicamento</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Paracetamol, Losartana Potássica"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dosagem</label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="Ex: 50mg, 10mg - 5ml"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fabricante / Laboratório</label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Ex: Medley, EMS, Pfizer"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data de Validade</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Quantidade Inicial</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Limite Crítico de Estoque (Alerta)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 text-slate-700 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">O sistema gerará um alerta inteligente caso o saldo caia para este valor ou menos.</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

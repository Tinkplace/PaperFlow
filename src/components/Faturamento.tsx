import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Plus, Trash2, Save, Search, Edit2, Check, X } from 'lucide-react';

interface TabelaFreteRow {
  id: string;
  origem: string;
  destino: string;
  valor_frete_ton_usd: number;
  valor_frete_kg_usd: number;
}

interface FreteVeiculo {
  id: string;
  placa_carreta: string;
  numero_crt: string;
  origem: string;
  destino: string;
  peso_kg: number;
  valor_frete_usd: number;
}

export default function Faturamento() {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'complementar'>('cadastro');
  const [tabelaFrete, setTabelaFrete] = useState<TabelaFreteRow[]>([]);
  const [freteVeiculos, setFreteVeiculos] = useState<FreteVeiculo[]>([]);
  const [fretePadrao, setFretePadrao] = useState(4392.99);
  const [editingFretePadrao, setEditingFretePadrao] = useState(false);
  const [tempFretePadrao, setTempFretePadrao] = useState('4392.99');
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterCrt, setFilterCrt] = useState('');
  const [newRow, setNewRow] = useState({
    origem: '',
    destino: '',
    valor_frete_ton_usd: '',
    valor_frete_kg_usd: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: freteData } = await supabase
        .from('tabela_frete')
        .select('*')
        .order('origem', { ascending: true });

      const { data: configData } = await supabase
        .from('frete_complementar_config')
        .select('frete_padrao_usd')
        .single();

      const { data: veiculosData } = await supabase
        .from('frete_veiculos')
        .select('*')
        .order('created_at', { ascending: false });

      if (freteData) setTabelaFrete(freteData);
      if (configData) {
        setFretePadrao(Number(configData.frete_padrao_usd));
        setTempFretePadrao(configData.frete_padrao_usd.toString());
      }
      if (veiculosData) setFreteVeiculos(veiculosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = async () => {
    if (!newRow.origem || !newRow.destino) return;

    try {
      const { data, error } = await supabase
        .from('tabela_frete')
        .insert([{
          origem: newRow.origem,
          destino: newRow.destino,
          valor_frete_ton_usd: Number(newRow.valor_frete_ton_usd) || 0,
          valor_frete_kg_usd: Number(newRow.valor_frete_kg_usd) || 0
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTabelaFrete([...tabelaFrete, data]);
        setNewRow({ origem: '', destino: '', valor_frete_ton_usd: '', valor_frete_kg_usd: '' });
      }
    } catch (error) {
      console.error('Erro ao adicionar linha:', error);
    }
  };

  const handleUpdateRow = async (id: string, field: string, value: string) => {
    try {
      const updateData: any = { [field]: field.includes('valor') ? Number(value) : value };

      const { error } = await supabase
        .from('tabela_frete')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setTabelaFrete(tabelaFrete.map(row =>
        row.id === id ? { ...row, ...updateData } : row
      ));
    } catch (error) {
      console.error('Erro ao atualizar linha:', error);
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta linha?')) return;

    try {
      const { error } = await supabase
        .from('tabela_frete')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTabelaFrete(tabelaFrete.filter(row => row.id !== id));
    } catch (error) {
      console.error('Erro ao excluir linha:', error);
    }
  };

  const handleSaveFretePadrao = async () => {
    try {
      const novoValor = Number(tempFretePadrao);
      if (isNaN(novoValor)) return;

      const { error } = await supabase
        .from('frete_complementar_config')
        .update({ frete_padrao_usd: novoValor, updated_at: new Date().toISOString() })
        .eq('id', (await supabase.from('frete_complementar_config').select('id').single()).data?.id);

      if (error) throw error;

      setFretePadrao(novoValor);
      setEditingFretePadrao(false);
    } catch (error) {
      console.error('Erro ao atualizar frete padrão:', error);
    }
  };

  const getFilteredVeiculos = () => {
    let filtered = freteVeiculos;

    if (filterPlaca.trim()) {
      filtered = filtered.filter(v =>
        v.placa_carreta.toLowerCase().includes(filterPlaca.toLowerCase())
      );
    }

    if (filterCrt.trim()) {
      filtered = filtered.filter(v =>
        v.numero_crt.toLowerCase().includes(filterCrt.toLowerCase())
      );
    }

    return filtered;
  };

  const calcularTotais = () => {
    const filteredVeiculos = getFilteredVeiculos();
    const somatoriaFrete = filteredVeiculos.reduce((acc, v) => acc + Number(v.valor_frete_usd), 0);
    const complementar = somatoriaFrete - fretePadrao;
    return { somatoriaFrete, complementar };
  };

  const { somatoriaFrete, complementar } = calcularTotais();
  const filteredVeiculos = getFilteredVeiculos();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('cadastro')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'cadastro'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cadastro da Tabela de Frete
            </button>
            <button
              onClick={() => setActiveTab('complementar')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'complementar'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Frete Complementar
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'cadastro' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Tabela de Frete</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="w-4 h-4" />
                  {tabelaFrete.length} {tabelaFrete.length === 1 ? 'rota cadastrada' : 'rotas cadastradas'}
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase w-[30%]">
                        Origem
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase w-[30%]">
                        Destino
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase w-[15%]">
                        Valor Frete TON (US$)
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase w-[15%]">
                        Valor Frete KG (US$)
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase w-[10%]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                          Carregando...
                        </td>
                      </tr>
                    ) : (
                      <>
                        {tabelaFrete.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1">
                              <input
                                type="text"
                                value={row.origem}
                                onChange={(e) => handleUpdateRow(row.id, 'origem', e.target.value)}
                                className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <input
                                type="text"
                                value={row.destino}
                                onChange={(e) => handleUpdateRow(row.id, 'destino', e.target.value)}
                                className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-blue-500 rounded text-red-600 font-medium"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={row.valor_frete_ton_usd}
                                onChange={(e) => handleUpdateRow(row.id, 'valor_frete_ton_usd', e.target.value)}
                                className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <input
                                type="number"
                                step="0.0001"
                                value={row.valor_frete_kg_usd}
                                onChange={(e) => handleUpdateRow(row.id, 'valor_frete_kg_usd', e.target.value)}
                                className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-green-50">
                          <td className="border border-gray-300 px-2 py-1">
                            <input
                              type="text"
                              placeholder="Digite a origem..."
                              value={newRow.origem}
                              onChange={(e) => setNewRow({ ...newRow, origem: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-1">
                            <input
                              type="text"
                              placeholder="Digite o destino..."
                              value={newRow.destino}
                              onChange={(e) => setNewRow({ ...newRow, destino: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={newRow.valor_frete_ton_usd}
                              onChange={(e) => setNewRow({ ...newRow, valor_frete_ton_usd: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-1">
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="0.0000"
                              value={newRow.valor_frete_kg_usd}
                              onChange={(e) => setNewRow({ ...newRow, valor_frete_kg_usd: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-center">
                            <button
                              onClick={handleAddRow}
                              disabled={!newRow.origem || !newRow.destino}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Clique nas células para editar os valores diretamente na tabela.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Frete Complementar</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por placa..."
                      value={filterPlaca}
                      onChange={(e) => setFilterPlaca(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por CRT..."
                      value={filterCrt}
                      onChange={(e) => setFilterCrt(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium uppercase">Frete CRT Padrão</p>
                      {editingFretePadrao ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="number"
                            step="0.01"
                            value={tempFretePadrao}
                            onChange={(e) => setTempFretePadrao(e.target.value)}
                            className="w-32 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleSaveFretePadrao}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFretePadrao(false);
                              setTempFretePadrao(fretePadrao.toString());
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-2xl font-bold text-blue-900">US$ {fretePadrao.toFixed(2)}</p>
                          <button
                            onClick={() => setEditingFretePadrao(true)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <DollarSign className="w-10 h-10 text-blue-600 opacity-20" />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 font-medium uppercase">Somatória Frete Veículos</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">US$ {somatoriaFrete.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-green-600 opacity-20" />
                  </div>
                </div>

                <div className={`border rounded-lg p-4 ${complementar >= 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase ${complementar >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        Valor Complementar
                      </p>
                      <p className={`text-2xl font-bold mt-2 ${complementar >= 0 ? 'text-yellow-900' : 'text-red-900'}`}>
                        US$ {complementar.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className={`w-10 h-10 opacity-20 ${complementar >= 0 ? 'text-yellow-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                        Placa Carreta
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                        CRT
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                        Origem
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                        Destino
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                        Peso (kg)
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                        Valor Frete (US$)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVeiculos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                          {freteVeiculos.length === 0
                            ? 'Nenhuma viagem registrada'
                            : 'Nenhum veículo encontrado com este filtro'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredVeiculos.map((veiculo) => (
                        <tr key={veiculo.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                            {veiculo.placa_carreta}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">
                            {veiculo.numero_crt}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-gray-700">
                            {veiculo.origem}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-red-600 font-medium">
                            {veiculo.destino}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-gray-900 font-medium">
                            {veiculo.peso_kg.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-gray-900 font-bold">
                            {veiculo.valor_frete_usd.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500">
                Fórmula: Valor Complementar = Somatória Frete Veículos - Frete CRT Padrão
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

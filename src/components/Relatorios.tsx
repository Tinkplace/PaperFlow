import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Truck, Clock, CheckCircle, Search, Download } from 'lucide-react';

interface CrtData {
  numero_crt: string;
  numero_ov: string;
  numero_fatura: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  bobinas_count: number;
  peso_total: number;
  status: string;
  carga_completa: boolean;
  exportador?: string;
  importador?: string;
}

type FilterType = 'todos' | 'carga_completa' | 'saida' | 'pendentes';

export default function Relatorios() {
  const [crts, setCrts] = useState<CrtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [searchCrt, setSearchCrt] = useState('');
  const [searchOv, setSearchOv] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: allBobinas } = await supabase
        .from('bobinas')
        .select('*')
        .order('created_at', { ascending: false });

      if (allBobinas) {
        const crtMap = new Map<string, CrtData>();

        allBobinas.forEach(bobina => {
          const key = `${bobina.numero_crt}-${bobina.numero_ov}`;

          if (!crtMap.has(key)) {
            crtMap.set(key, {
              numero_crt: bobina.numero_crt || '-',
              numero_ov: bobina.numero_ov || '-',
              numero_fatura: bobina.numero_fatura || '-',
              tipo_papel: bobina.tipo_papel || '-',
              gramatura: bobina.gramatura || 0,
              formato_mm: bobina.formato_mm || 0,
              bobinas_count: 0,
              peso_total: 0,
              status: bobina.status || 'em_estoque',
              carga_completa: bobina.carga_completa || false,
              exportador: bobina.exportador,
              importador: bobina.importador,
            });
          }

          const crtData = crtMap.get(key)!;
          crtData.bobinas_count++;
          crtData.peso_total += Number(bobina.peso_kg) || 0;

          if (bobina.status === 'carregado') {
            crtData.status = 'carregado';
          }
          if (bobina.carga_completa) {
            crtData.carga_completa = true;
          }
        });

        setCrts(Array.from(crtMap.values()));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCrts = () => {
    let filtered = crts;

    switch (filterType) {
      case 'carga_completa':
        filtered = crts.filter(crt => crt.carga_completa && crt.status === 'em_estoque');
        break;
      case 'saida':
        filtered = crts.filter(crt => crt.status === 'carregado');
        break;
      case 'pendentes':
        filtered = crts.filter(crt => !crt.carga_completa && crt.status === 'em_estoque');
        break;
      default:
        filtered = crts;
    }

    if (searchCrt.trim()) {
      filtered = filtered.filter(crt =>
        crt.numero_crt.toLowerCase().includes(searchCrt.toLowerCase())
      );
    }

    if (searchOv.trim()) {
      filtered = filtered.filter(crt =>
        crt.numero_ov.toLowerCase().includes(searchOv.toLowerCase())
      );
    }

    return filtered;
  };

  const getStats = () => {
    const cargaCompleta = crts.filter(crt => crt.carga_completa && crt.status === 'em_estoque').length;
    const saida = crts.filter(crt => crt.status === 'carregado').length;
    const pendentes = crts.filter(crt => !crt.carga_completa && crt.status === 'em_estoque').length;
    const total = crts.length;

    return { cargaCompleta, saida, pendentes, total };
  };

  const exportToCSV = () => {
    const filtered = getFilteredCrts();
    const headers = ['CRT', 'OV', 'Fatura', 'Tipo Papel', 'Gramatura', 'Formato (mm)', 'Bobinas', 'Peso Total (kg)', 'Status', 'Carga Completa', 'Exportador', 'Importador'];

    const rows = filtered.map(crt => [
      crt.numero_crt,
      crt.numero_ov,
      crt.numero_fatura,
      crt.tipo_papel,
      crt.gramatura,
      crt.formato_mm,
      crt.bobinas_count,
      crt.peso_total.toFixed(2),
      crt.status === 'carregado' ? 'Saída' : 'Em Estoque',
      crt.carga_completa ? 'Sim' : 'Não',
      crt.exportador || '-',
      crt.importador || '-',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${filterType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = getStats();
  const filteredCrts = getFilteredCrts();

  const getStatusLabel = (status: string) => {
    return status === 'carregado' ? 'Saída' : 'Em Estoque';
  };

  const getStatusColor = (status: string) => {
    return status === 'carregado' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterType('carga_completa')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all text-left ${
            filterType === 'carga_completa' ? 'ring-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Carga Completa</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cargaCompleta}</p>
              <p className="text-xs text-gray-500 mt-1">Prontos para pedido</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterType('saida')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all text-left ${
            filterType === 'saida' ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saída</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.saida}</p>
              <p className="text-xs text-gray-500 mt-1">Carregados</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterType('pendentes')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all text-left ${
            filterType === 'pendentes' ? 'ring-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendentes}</p>
              <p className="text-xs text-gray-500 mt-1">Sem carga completa</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterType('todos')}
          className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all text-left ${
            filterType === 'todos' ? 'ring-2 ring-gray-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Todos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total de CRTs</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {filterType === 'carga_completa' && 'CRTs com Carga Completa'}
                {filterType === 'saida' && 'CRTs com Saída (Carregados)'}
                {filterType === 'pendentes' && 'CRTs Pendentes'}
                {filterType === 'todos' && 'Todos os CRTs'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredCrts.length} {filteredCrts.length === 1 ? 'registro encontrado' : 'registros encontrados'}
              </p>
            </div>

            <button
              onClick={exportToCSV}
              disabled={filteredCrts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por CRT..."
                value={searchCrt}
                onChange={(e) => setSearchCrt(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por OV..."
                value={searchOv}
                onChange={(e) => setSearchOv(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Carregando...</div>
            </div>
          ) : filteredCrts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Nenhum CRT encontrado</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchCrt || searchOv ? 'Tente ajustar os filtros de busca' : 'Não há dados disponíveis para esta categoria'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CRT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OV
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fatura
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo Papel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gram.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Formato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bobinas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Peso Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carga Completa
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCrts.map((crt, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {crt.numero_crt}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {crt.numero_ov}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {crt.numero_fatura}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {crt.tipo_papel}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {crt.gramatura}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {crt.formato_mm}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {crt.bobinas_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {crt.peso_total.toFixed(2)} kg
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(crt.status)}`}>
                        {getStatusLabel(crt.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {crt.carga_completa ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                          <Clock className="w-4 h-4 text-gray-400" />
                        </span>
                      )}
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

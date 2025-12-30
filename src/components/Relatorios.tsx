import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Truck, Clock, CheckCircle, Search, Download, FileText } from 'lucide-react';

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

interface PedidoData {
  id: string;
  numero_crt: string;
  numero_ov: string;
  numero_fatura: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  quantidade_bobinas: number;
  peso_total_kg: number;
  destinos: string[];
  created_at: string;
  cancelado: boolean;
}

type FilterType = 'todos' | 'carga_completa' | 'saida' | 'pendentes';

export default function Relatorios() {
  const [crts, setCrts] = useState<CrtData[]>([]);
  const [pedidos, setPedidos] = useState<PedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [searchCrt, setSearchCrt] = useState('');
  const [searchOv, setSearchOv] = useState('');
  const [searchPedidoCrt, setSearchPedidoCrt] = useState('');
  const [searchPedidoOv, setSearchPedidoOv] = useState('');

  useEffect(() => {
    loadData();
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    try {
      const { data: pedidosData, error } = await supabase
        .from('pedidos')
        .select('*')
        .not('destino', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosComDestinos = await Promise.all(
        (pedidosData || []).map(async (pedido) => {
          const { data: destinosData } = await supabase
            .from('pedidos_destinos')
            .select('destino')
            .eq('pedido_id', pedido.id)
            .order('ordem', { ascending: true });

          return {
            id: pedido.id,
            numero_crt: pedido.numero_crt,
            numero_ov: pedido.numero_ov,
            numero_fatura: pedido.numero_fatura,
            tipo_papel: pedido.tipo_papel,
            gramatura: pedido.gramatura,
            formato_mm: pedido.formato_mm,
            quantidade_bobinas: pedido.quantidade_bobinas,
            peso_total_kg: pedido.peso_total_kg,
            destinos: destinosData?.map(d => d.destino) || [],
            created_at: pedido.created_at,
            cancelado: pedido.cancelado,
          };
        })
      );

      setPedidos(pedidosComDestinos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

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

  const getFilteredPedidos = () => {
    let filtered = pedidos;

    if (searchPedidoCrt.trim()) {
      filtered = filtered.filter(pedido =>
        pedido.numero_crt.toLowerCase().includes(searchPedidoCrt.toLowerCase())
      );
    }

    if (searchPedidoOv.trim()) {
      filtered = filtered.filter(pedido =>
        pedido.numero_ov.toLowerCase().includes(searchPedidoOv.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredPedidos = getFilteredPedidos();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pedidos Realizados</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredPedidos.length} de {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar por CRT..."
                value={searchPedidoCrt}
                onChange={(e) => setSearchPedidoCrt(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar por OV..."
                value={searchPedidoOv}
                onChange={(e) => setSearchPedidoOv(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredPedidos.length === 0 && pedidos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Nenhum pedido realizado</p>
              <p className="text-gray-400 text-sm mt-2">
                Os pedidos gerados aparecerão aqui
              </p>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Nenhum pedido encontrado</p>
              <p className="text-gray-400 text-sm mt-2">
                Tente ajustar os filtros de busca
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRT</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OV</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fatura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Papel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gram.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bobinas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{pedido.numero_crt}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pedido.numero_ov || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pedido.numero_fatura || '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{pedido.tipo_papel || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pedido.gramatura || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pedido.formato_mm || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{pedido.quantidade_bobinas}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{pedido.peso_total_kg.toFixed(2)} kg</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pedido.destinos.map((destino, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {destino}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pedido.cancelado
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {pedido.cancelado ? 'Cancelado' : 'Ativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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

import { useState, useEffect } from 'react';
import { Search, Package, Filter, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BobinaEstoque {
  id: string;
  numero_bobina: string;
  numero_crt: string;
  numero_oc: string;
  numero_proforma: string;
  numero_ov: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  peso_kg: number;
  exportador: string;
  importador: string;
  origem: string;
  status: string;
  data_emissao: string;
  data_entrada: string;
  data_descarga: string;
  placa_cavalo: string;
  placa_carreta: string;
  nome_motorista: string;
  rua: string;
  quadra: string;
  linha: string;
  nota_fiscal_id: string;
  created_at: string;
}

interface NotaFiscal {
  id: string;
  numero_nota_fiscal: string;
  valor_nota_fiscal: number;
}

export default function Estoque() {
  const [bobinas, setBobinas] = useState<BobinaEstoque[]>([]);
  const [notasFiscais, setNotasFiscais] = useState<Map<string, NotaFiscal>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    numeroBobina: '',
    numeroCrt: '',
    numeroOv: '',
    tipoPapel: '',
    exportador: '',
    importador: '',
  });

  useEffect(() => {
    loadEstoque();
  }, []);

  const loadEstoque = async () => {
    setLoading(true);
    try {
      const { data: bobinasData, error: bobinasError } = await supabase
        .from('bobinas')
        .select('*')
        .eq('status', 'em_estoque')
        .order('created_at', { ascending: false });

      if (bobinasError) throw bobinasError;

      if (bobinasData && bobinasData.length > 0) {
        const notaFiscalIds = [...new Set(bobinasData.map(b => b.nota_fiscal_id).filter(Boolean))];

        if (notaFiscalIds.length > 0) {
          const { data: notasData, error: notasError } = await supabase
            .from('notas_fiscais')
            .select('*')
            .in('id', notaFiscalIds);

          if (notasError) throw notasError;

          if (notasData) {
            const notasMap = new Map<string, NotaFiscal>();
            notasData.forEach(nf => notasMap.set(nf.id, nf));
            setNotasFiscais(notasMap);
          }
        }
      }

      setBobinas(bobinasData || []);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      alert('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  const bobinasFiltradas = bobinas.filter((bobina) => {
    const matchBobina = filtros.numeroBobina === '' ||
      bobina.numero_bobina?.toLowerCase().includes(filtros.numeroBobina.toLowerCase());
    const matchCrt = filtros.numeroCrt === '' ||
      bobina.numero_crt?.toLowerCase().includes(filtros.numeroCrt.toLowerCase());
    const matchOv = filtros.numeroOv === '' ||
      bobina.numero_ov?.toLowerCase().includes(filtros.numeroOv.toLowerCase());
    const matchTipo = filtros.tipoPapel === '' ||
      bobina.tipo_papel === filtros.tipoPapel;
    const matchExportador = filtros.exportador === '' ||
      bobina.exportador?.toLowerCase().includes(filtros.exportador.toLowerCase());
    const matchImportador = filtros.importador === '' ||
      bobina.importador?.toLowerCase().includes(filtros.importador.toLowerCase());

    return matchBobina && matchCrt && matchOv && matchTipo && matchExportador && matchImportador;
  });

  const estatisticas = {
    totalBobinas: bobinasFiltradas.length,
    pesoTotal: bobinasFiltradas.reduce((sum, b) => sum + (b.peso_kg || 0), 0),
    totalCrts: new Set(bobinasFiltradas.map(b => b.numero_crt)).size,
    porTipoPapel: bobinasFiltradas.reduce((acc, b) => {
      acc[b.tipo_papel] = (acc[b.tipo_papel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const limparFiltros = () => {
    setFiltros({
      numeroBobina: '',
      numeroCrt: '',
      numeroOv: '',
      tipoPapel: '',
      exportador: '',
      importador: '',
    });
  };

  const handleFiltroChange = (campo: keyof typeof filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const exportarParaCSV = () => {
    const headers = [
      'Número Bobina',
      'CRT',
      'OV',
      'OC',
      'Proforma',
      'Tipo Papel',
      'Gramatura',
      'Formato (mm)',
      'Peso (kg)',
      'Exportador',
      'Importador',
      'Origem',
      'Nota Fiscal',
      'Rua',
      'Quadra',
      'Linha',
      'Data Entrada',
    ];

    const rows = bobinasFiltradas.map(b => [
      b.numero_bobina,
      b.numero_crt,
      b.numero_ov,
      b.numero_oc,
      b.numero_proforma,
      b.tipo_papel,
      b.gramatura,
      b.formato_mm,
      b.peso_kg,
      b.exportador,
      b.importador,
      b.origem,
      notasFiscais.get(b.nota_fiscal_id)?.numero_nota_fiscal || '',
      b.rua,
      b.quadra,
      b.linha,
      b.data_entrada ? new Date(b.data_entrada).toLocaleDateString('pt-BR') : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando estoque...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Bobinas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{estatisticas.totalBobinas}</p>
            </div>
            <Package className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Peso Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {estatisticas.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">kg</p>
            </div>
            <Package className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CRTs Distintos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{estatisticas.totalCrts}</p>
            </div>
            <Package className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Por Tipo de Papel</p>
            <div className="space-y-1">
              {Object.entries(estatisticas.porTipoPapel).map(([tipo, qtd]) => (
                <div key={tipo} className="flex justify-between text-sm">
                  <span className="text-gray-700">{tipo}:</span>
                  <span className="font-semibold text-gray-900">{qtd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-700" />
          <span className="font-medium text-gray-700">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número da Bobina
            </label>
            <input
              type="text"
              value={filtros.numeroBobina}
              onChange={(e) => handleFiltroChange('numeroBobina', e.target.value)}
              placeholder="Buscar por número..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do CRT
            </label>
            <input
              type="text"
              value={filtros.numeroCrt}
              onChange={(e) => handleFiltroChange('numeroCrt', e.target.value)}
              placeholder="Buscar por CRT..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OV
            </label>
            <input
              type="text"
              value={filtros.numeroOv}
              onChange={(e) => handleFiltroChange('numeroOv', e.target.value)}
              placeholder="Buscar por OV..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Papel
            </label>
            <select
              value={filtros.tipoPapel}
              onChange={(e) => handleFiltroChange('tipoPapel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="Kraftliner">Kraftliner</option>
              <option value="Eukaliner">Eukaliner</option>
              <option value="Testliner">Testliner</option>
              <option value="Fluting">Fluting</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exportador
            </label>
            <input
              type="text"
              value={filtros.exportador}
              onChange={(e) => handleFiltroChange('exportador', e.target.value)}
              placeholder="Buscar por exportador..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importador
            </label>
            <input
              type="text"
              value={filtros.importador}
              onChange={(e) => handleFiltroChange('importador', e.target.value)}
              placeholder="Buscar por importador..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={limparFiltros}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            Limpar Filtros
          </button>
          <button
            onClick={exportarParaCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Bobinas em Estoque
            </h3>
            <span className="text-sm text-gray-600">
              Mostrando {bobinasFiltradas.length} de {bobinas.length} bobinas
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nº Bobina
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CRT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OV
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nota Fiscal
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
                  Peso (kg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exportador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endereço
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Entrada
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bobinasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                    {bobinas.length === 0
                      ? 'Nenhuma bobina em estoque.'
                      : 'Nenhuma bobina corresponde aos filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                bobinasFiltradas.map((bobina) => (
                  <tr key={bobina.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bobina.numero_bobina}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.numero_crt}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.numero_ov}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {notasFiscais.get(bobina.nota_fiscal_id)?.numero_nota_fiscal || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.tipo_papel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.gramatura}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.formato_mm}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.peso_kg?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.exportador || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.importador || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.rua && bobina.quadra && bobina.linha
                        ? `${bobina.rua}-${bobina.quadra}-${bobina.linha}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {bobina.data_entrada
                        ? new Date(bobina.data_entrada).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Calendar, CheckCircle, XCircle, Clock, Package } from 'lucide-react';

interface Pedido {
  id: string;
  numero_crt: string;
  numero_fatura: string;
  created_at: string;
  data_dip_processado: string | null;
  data_entrega: string | null;
  status_pedido: string;
}

interface OTIFStats {
  total: number;
  onTime: number;
  late: number;
  percentage: number;
}

type CalculationMode = 'pedido' | 'dip';

export default function IndicadorOTIF() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CalculationMode>('pedido');

  useEffect(() => {
    loadPedidos();
    const subscription = supabase
      .channel('pedidos_otif_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        loadPedidos();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_crt, numero_fatura, created_at, data_dip_processado, data_entrega, status_pedido')
        .eq('status_pedido', 'entregue')
        .eq('cancelado', false)
        .not('data_entrega', 'is', null)
        .order('data_entrega', { ascending: false });

      if (error) throw error;

      setPedidos(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOTIF = (): OTIFStats => {
    if (pedidos.length === 0) {
      return { total: 0, onTime: 0, late: 0, percentage: 0 };
    }

    let onTime = 0;
    let late = 0;

    pedidos.forEach((pedido) => {
      const dias = calculateDays(pedido);
      if (dias !== null && dias <= 10) {
        onTime++;
      } else if (dias !== null) {
        late++;
      }
    });

    const total = onTime + late;
    const percentage = total > 0 ? (onTime / total) * 100 : 0;

    return { total, onTime, late, percentage };
  };

  const calculateDays = (pedido: Pedido): number | null => {
    if (!pedido.data_entrega) return null;

    let startDate: Date;

    if (mode === 'dip') {
      if (!pedido.data_dip_processado) return null;
      startDate = new Date(pedido.data_dip_processado);
    } else {
      startDate = new Date(pedido.created_at);
    }

    const endDate = new Date(pedido.data_entrega);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const isOnTime = (pedido: Pedido): boolean | null => {
    const dias = calculateDays(pedido);
    if (dias === null) return null;
    return dias <= 10;
  };

  const stats = calculateOTIF();

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPercentageBgColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-green-100';
    if (percentage >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Carregando dados OTIF...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Indicador OTIF (On Time In Full)
          </h2>
          <p className="text-xs text-gray-500 mt-1">On Time = Entregue em até 10 dias</p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('pedido')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'pedido'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" />
                Data do Pedido
              </button>
              <button
                onClick={() => setMode('dip')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'dip'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Data do DIP
              </button>
            </div>
          </div>

          <div className={`${getPercentageBgColor(stats.percentage)} rounded-2xl p-8 mb-6`}>
            <div className="text-center">
              <div className={`text-7xl font-bold ${getPercentageColor(stats.percentage)} mb-2`}>
                {stats.percentage.toFixed(1)}%
              </div>
              <div className="text-lg font-medium text-gray-700">Performance OTIF</div>
              <div className="text-sm text-gray-600 mt-2">
                {mode === 'pedido' ? 'Baseado na data do pedido' : 'Baseado na data do DIP processado'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total de Pedidos</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.onTime}</div>
              <div className="text-xs text-gray-600 mt-1">No Prazo</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.late}</div>
              <div className="text-xs text-gray-600 mt-1">Atrasados</div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Como funciona:</strong> O indicador OTIF mede a porcentagem de pedidos entregues no prazo.
                Um pedido é considerado <strong>On Time</strong> quando é entregue em até <strong>10 dias</strong> após
                {mode === 'pedido' ? ' a data de registro do pedido' : ' a data de processamento do DIP'}.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-semibold text-gray-900">Detalhamento dos Pedidos Entregues</h3>
        </div>

        {pedidos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum pedido entregue encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CRT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fatura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {mode === 'pedido' ? 'Data do Pedido' : 'Data do DIP'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Entrega
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dias
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedidos.map((pedido) => {
                  const dias = calculateDays(pedido);
                  const onTime = isOnTime(pedido);
                  const dataInicio = mode === 'dip' ? pedido.data_dip_processado : pedido.created_at;

                  if (mode === 'dip' && !pedido.data_dip_processado) {
                    return null;
                  }

                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pedido.numero_crt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {pedido.numero_fatura || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`text-sm font-semibold ${
                          dias !== null && dias <= 10 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {dias !== null ? `${dias} dias` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {onTime === null ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            N/A
                          </span>
                        ) : onTime ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            No Prazo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Atrasado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Metas de Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Excelente</div>
            <div className="text-lg font-bold text-green-600">≥ 90%</div>
            <div className="text-xs text-gray-500 mt-1">Meta ideal de entrega</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Bom</div>
            <div className="text-lg font-bold text-yellow-600">75% - 89%</div>
            <div className="text-xs text-gray-500 mt-1">Performance aceitável</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Atenção</div>
            <div className="text-lg font-bold text-red-600">&lt; 75%</div>
            <div className="text-xs text-gray-500 mt-1">Requer melhorias</div>
          </div>
        </div>
      </div>
    </div>
  );
}

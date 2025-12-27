import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, CheckCircle, Truck, Home, Shield } from 'lucide-react';

interface Pedido {
  id: string;
  numero_crt: string;
  numero_fatura: string;
  status_pedido: string;
  destino: string;
}

export default function CrossBorder() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPedidoId, setSelectedPedidoId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, numero_crt, numero_fatura, status_pedido, destino')
      .in('status_pedido', ['aduana_br', 'aduana_ar', 'rota'])
      .eq('cancelado', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pedidos:', error);
      return;
    }

    if (data) {
      setPedidos(data);
    }
  };

  const handleAtualizarStatus = async () => {
    if (!selectedPedidoId || !selectedStatus) {
      alert('Selecione um CRT e um status');
      return;
    }

    setLoading(true);
    try {
      const updateData: { status_pedido: string; data_entrega?: string } = {
        status_pedido: selectedStatus
      };

      if (selectedStatus === 'entregue') {
        updateData.data_entrega = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', selectedPedidoId);

      if (error) throw error;

      alert('Status atualizado com sucesso!');
      setSelectedPedidoId('');
      setSelectedStatus('');
      loadPedidos();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      alert(`Erro ao atualizar status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedPedido = pedidos.find(p => p.id === selectedPedidoId);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aduana_br':
        return 'Aduana BR';
      case 'aduana_ar':
        return 'Aduana AR';
      case 'rota':
        return 'Em Rota de Entrega';
      case 'entregue':
        return 'Entregue';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aduana_br':
        return 'bg-yellow-100 text-yellow-800';
      case 'aduana_ar':
        return 'bg-blue-100 text-blue-800';
      case 'rota':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          Cross Border
        </h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o CRT *
          </label>
          <select
            value={selectedPedidoId}
            onChange={(e) => setSelectedPedidoId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um CRT</option>
            {pedidos.map((pedido) => (
              <option key={pedido.id} value={pedido.id}>
                {pedido.numero_crt} - {getStatusLabel(pedido.status_pedido)}
              </option>
            ))}
          </select>
        </div>

        {pedidos.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-blue-600" />
              CRTs em Trânsito Internacional ({pedidos.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CRT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fatura
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destino
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Atual
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pedidos.map((pedido) => (
                    <tr
                      key={pedido.id}
                      className={`hover:bg-blue-50 transition-colors ${
                        selectedPedidoId === pedido.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {pedido.numero_crt}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {pedido.numero_fatura || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {pedido.destino || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pedido.status_pedido)}`}>
                          {getStatusLabel(pedido.status_pedido)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedPedido && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Atualizar Status do CRT
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número CRT
                </label>
                <input
                  type="text"
                  value={selectedPedido.numero_crt}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Atual
                </label>
                <input
                  type="text"
                  value={getStatusLabel(selectedPedido.status_pedido)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Novo Status *
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                >
                  <option value="">Selecione um status</option>
                  <option value="aduana_ar">
                    <Shield className="inline w-4 h-4 mr-2" />
                    Aduana AR
                  </option>
                  <option value="rota">
                    <Truck className="inline w-4 h-4 mr-2" />
                    Em Rota de Entrega
                  </option>
                  <option value="entregue">
                    <Home className="inline w-4 h-4 mr-2" />
                    Entregue
                  </option>
                </select>

                <div className="flex gap-3 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Aduana AR - Liberação aduaneira na Argentina</span>
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600" />
                    <span>Em Rota - Mercadoria em transporte para destino final</span>
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-600" />
                    <span>Entregue - Mercadoria recebida pelo cliente</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAtualizarStatus}
              disabled={loading || !selectedStatus}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? 'Atualizando...' : 'Atualizar Status'}
            </button>
          </div>
        )}

        {pedidos.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum CRT em trânsito internacional</p>
          </div>
        )}
      </div>
    </div>
  );
}

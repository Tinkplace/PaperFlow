import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Pedido {
  id: string;
  numero_crt: string;
  numero_fatura: string;
  dip_processado: boolean;
}

export default function ControleDips() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPedidos();

    const subscription = supabase
      .channel('pedidos_dips_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchPedidos();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_crt, numero_fatura, dip_processado')
        .not('numero_crt', 'is', null)
        .not('destino', 'is', null)
        .eq('cancelado', false)
        .order('created_at', { ascending: false});

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDip = async (pedidoId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const updateData: { dip_processado: boolean; status_pedido?: string; data_dip_processado?: string | null } = {
        dip_processado: newStatus
      };

      if (newStatus) {
        updateData.status_pedido = 'separacao';
        updateData.data_dip_processado = new Date().toISOString();
      } else {
        updateData.data_dip_processado = null;
      }

      const { error } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', pedidoId);

      if (error) throw error;
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao atualizar DIP:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Controle de DIPs</h2>

      {pedidos.length === 0 ? (
        <p className="text-gray-500">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  CRT: <span className="font-semibold text-blue-600">{pedido.numero_crt}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Fatura: <span className="font-medium">{pedido.numero_fatura || 'N/A'}</span>
                </p>
                <p className="text-xs mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
                    pedido.dip_processado
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {pedido.dip_processado ? 'DIP Processado' : 'Aguardando DIP'}
                  </span>
                </p>
              </div>

              <button
                onClick={() => handleToggleDip(pedido.id, pedido.dip_processado)}
                className={`ml-4 p-2 rounded-lg transition-all ${
                  pedido.dip_processado
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={pedido.dip_processado ? 'Desmarcar DIP' : 'Marcar DIP como Processado'}
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

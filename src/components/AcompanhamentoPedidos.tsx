import { useState, useEffect } from 'react';
import { Package, CheckCircle, Clock, FileText, Truck, MapPin, Home, Shield, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PedidoTimeline {
  id: string;
  numero_crt: string;
  numero_proforma: string;
  dip_processado: boolean;
  status_atual: 'recebido' | 'aguardando_dip' | 'separacao' | 'carregamento' | 'aduana_br' | 'aduana_ar' | 'rota' | 'entregue';
  destinos: string[];
}

interface CancelModalProps {
  isOpen: boolean;
  pedidoId: string;
  numeroCrt: string;
  onClose: () => void;
  onConfirm: (pedidoId: string, justificativa: string) => void;
}

function CancelModal({ isOpen, pedidoId, numeroCrt, onClose, onConfirm }: CancelModalProps) {
  const [justificativa, setJustificativa] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (justificativa.trim()) {
      onConfirm(pedidoId, justificativa);
      setJustificativa('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <XCircle className="w-6 h-6 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Cancelar Pedido {numeroCrt}</h3>
        </div>

        <div className="mb-4">
          <label htmlFor="justificativa" className="block text-sm font-medium text-gray-700 mb-2">
            Justificativa do Cancelamento *
          </label>
          <textarea
            id="justificativa"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={4}
            placeholder="Descreva o motivo do cancelamento..."
            required
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!justificativa.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Confirmar Cancelamento
          </button>
        </div>
      </div>
    </div>
  );
}

const statusesTimeline = [
  { id: 'recebido', label: 'Pedido recebido', icon: FileText },
  { id: 'aguardando_dip', label: 'Aguardando DIP', icon: Clock },
  { id: 'separacao', label: 'Em Separação', icon: Package },
  { id: 'carregamento', label: 'Em carregamento', icon: CheckCircle },
  { id: 'aduana_br', label: 'Aduana BR', icon: Shield },
  { id: 'aduana_ar', label: 'Aduana AR', icon: Shield },
  { id: 'rota', label: 'Em Rota de Entrega', icon: Truck },
  { id: 'entregue', label: 'Entregue', icon: Home },
];

export default function AcompanhamentoPedidos() {
  const [pedidos, setPedidos] = useState<PedidoTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<{ id: string; numeroCrt: string } | null>(null);

  useEffect(() => {
    fetchPedidos();
    const subscription = supabase
      .channel('pedidos_changes')
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
        .select('id, numero_crt, numero_proforma, dip_processado, status_pedido, destino, cancelado')
        .not('destino', 'is', null)
        .eq('cancelado', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosComDestinos = await Promise.all(
        (data || []).map(async (pedido) => {
          const { data: destinosData } = await supabase
            .from('pedidos_destinos')
            .select('destino')
            .eq('pedido_id', pedido.id)
            .order('ordem', { ascending: true });

          const destinos = destinosData?.map(d => d.destino) || [pedido.destino].filter(Boolean);

          return {
            ...pedido,
            destinos,
            status_atual: (pedido.status_pedido ||
              (pedido.dip_processado ? 'separacao' : 'aguardando_dip')) as
              'recebido' | 'aguardando_dip' | 'separacao' | 'carregamento' | 'aduana_br' | 'aduana_ar' | 'rota' | 'entregue',
          };
        })
      );

      setPedidos(pedidosComDestinos);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (pedidoId: string, justificativa: string) => {
    try {
      const { error: deleteDestinosError } = await supabase
        .from('pedidos_destinos')
        .delete()
        .eq('pedido_id', pedidoId);

      if (deleteDestinosError) throw deleteDestinosError;

      const { error } = await supabase
        .from('pedidos')
        .update({
          cancelado: true,
          justificativa_cancelamento: justificativa,
          data_cancelamento: new Date().toISOString(),
          destino: null,
          status_pedido: null,
          carga_completa: false,
        })
        .eq('id', pedidoId);

      if (error) throw error;

      alert('Pedido cancelado com sucesso! O CRT retornou ao Estoque Armazém.');
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      alert('Erro ao cancelar pedido. Tente novamente.');
    }
  };

  const openCancelModal = (pedidoId: string, numeroCrt: string) => {
    setSelectedPedido({ id: pedidoId, numeroCrt });
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setSelectedPedido(null);
    setCancelModalOpen(false);
  };

  const getStatusIndex = (status: string) => {
    return statusesTimeline.findIndex(s => s.id === status);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {pedidos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          pedidos.map((pedido) => {
            const currentStatusIndex = getStatusIndex(pedido.status_atual);

            return (
              <div key={pedido.id} className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{pedido.numero_crt}</h3>
                  {pedido.destinos && pedido.destinos.length > 0 && (
                    <div className="flex items-start gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-wrap gap-2">
                        {pedido.destinos.map((destino, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {destino}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex overflow-x-auto gap-1 pb-4">
                  {statusesTimeline.map((status, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const IconComponent = status.icon;

                    return (
                      <div key={status.id} className="flex flex-col items-center flex-shrink-0">
                        <div className="mb-2 flex flex-col items-center">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                              isCompleted
                                ? isCurrent
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                  : 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            <IconComponent className="w-6 h-6" />
                          </div>
                        </div>

                        <div
                          className={`text-xs font-medium text-center w-20 leading-tight ${
                            isCompleted ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {status.label}
                        </div>

                        {index < statusesTimeline.length - 1 && (
                          <div
                            className={`absolute left-full w-12 h-1 top-6 ml-1 ${
                              index < currentStatusIndex ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                            style={{ width: '48px', height: '2px', marginLeft: '-38px', marginTop: '-22px' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Status atual: <span className="font-semibold text-gray-900">
                      {statusesTimeline[currentStatusIndex]?.label}
                    </span>
                  </p>
                  <button
                    onClick={() => openCancelModal(pedido.id, pedido.numero_crt)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar Pedido
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedPedido && (
        <CancelModal
          isOpen={cancelModalOpen}
          pedidoId={selectedPedido.id}
          numeroCrt={selectedPedido.numeroCrt}
          onClose={closeCancelModal}
          onConfirm={handleCancelOrder}
        />
      )}
    </>
  );
}

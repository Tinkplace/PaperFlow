import { useState, useEffect } from 'react';
import { supabase, Bobina } from '../lib/supabase';
import { Check, Package, X, FileText, Plus, XCircle } from 'lucide-react';

interface CrtCargaCompleta {
  numero_crt: string;
  bobinas: Bobina[];
  total_bobinas: number;
  peso_total: number;
  numero_fatura: string;
}

interface PedidoForm {
  numero_crt: string;
  numero_oc: string;
  numero_fatura: string;
  numero_ov: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  quantidade_bobinas: number;
  peso_total_kg: number;
  destinos: string[];
  prioridade: number;
}

interface PedidoAtivo {
  id: string;
  numero_crt: string;
  numero_oc: string;
  numero_ov: string;
  numero_fatura: string;
  quantidade_bobinas: number;
  peso_total_kg: number;
  destinos: string[];
  status_pedido: string;
  created_at: string;
}

const destinosOptions = [
  'Parana', 'Lujan', 'Arroyito', 'Quilmes', 'San Juan',
  'Cordoba', 'Pilar', 'Buenos Aires', 'Santa Fé', 'Rosário',
  'Mendoza', 'Santiago'
];

function CancelModal({
  isOpen,
  pedidoId,
  numeroCrt,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  pedidoId: string;
  numeroCrt: string;
  onClose: () => void;
  onConfirm: (pedidoId: string, justificativa: string) => void;
}) {
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

export default function Pedidos() {
  const [crtsCargaCompleta, setCrtsCargaCompleta] = useState<CrtCargaCompleta[]>([]);
  const [pedidosAtivos, setPedidosAtivos] = useState<PedidoAtivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCrt, setSelectedCrt] = useState<CrtCargaCompleta | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<{ id: string; numeroCrt: string } | null>(null);
  const [pedidoForm, setPedidoForm] = useState<PedidoForm>({
    numero_crt: '',
    numero_oc: '',
    numero_fatura: '',
    numero_ov: '',
    tipo_papel: '',
    gramatura: 0,
    formato_mm: 0,
    quantidade_bobinas: 0,
    peso_total_kg: 0,
    destinos: ['Parana'],
    prioridade: 50
  });

  useEffect(() => {
    loadCrtsCargaCompleta();
    loadPedidosAtivos();
  }, []);

  const loadCrtsCargaCompleta = async () => {
    setLoading(true);
    try {
      const { data: bobinasCompletas } = await supabase
        .from('bobinas')
        .select('*')
        .eq('carga_completa', true)
        .eq('status', 'em_estoque')
        .order('numero_crt', { ascending: true });

      const { data: pedidosGerados } = await supabase
        .from('pedidos')
        .select('numero_crt')
        .not('destino', 'is', null);

      const crtsGerados = new Set(pedidosGerados?.map(p => p.numero_crt) || []);

      if (bobinasCompletas) {
        const crtMap = new Map<string, Bobina[]>();

        bobinasCompletas.forEach(bobina => {
          if (bobina.numero_crt && !crtsGerados.has(bobina.numero_crt)) {
            if (!crtMap.has(bobina.numero_crt)) {
              crtMap.set(bobina.numero_crt, []);
            }
            crtMap.get(bobina.numero_crt)!.push(bobina);
          }
        });

        const crtsArray: CrtCargaCompleta[] = [];
        crtMap.forEach((bobinas, crt) => {
          const pesoTotal = bobinas.reduce((sum, b) => sum + Number(b.peso_kg), 0);
          const primeiraFatura = bobinas[0]?.numero_fatura || '';

          crtsArray.push({
            numero_crt: crt,
            bobinas,
            total_bobinas: bobinas.length,
            peso_total: pesoTotal,
            numero_fatura: primeiraFatura
          });
        });

        setCrtsCargaCompleta(crtsArray);
      }
    } catch (error) {
      console.error('Erro ao carregar CRTs com carga completa:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPedidosAtivos = async () => {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('id, numero_crt, numero_oc, numero_ov, numero_fatura, quantidade_bobinas, peso_total_kg, status_pedido, created_at')
        .eq('cancelado', false)
        .not('destino', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosComDestinos = await Promise.all(
        (pedidos || []).map(async (pedido) => {
          const { data: destinosData } = await supabase
            .from('pedidos_destinos')
            .select('destino')
            .eq('pedido_id', pedido.id)
            .order('ordem', { ascending: true });

          return {
            ...pedido,
            destinos: destinosData?.map(d => d.destino) || []
          };
        })
      );

      setPedidosAtivos(pedidosComDestinos);
    } catch (error) {
      console.error('Erro ao carregar pedidos ativos:', error);
    }
  };

  const handleCancelOrder = async (pedidoId: string, justificativa: string) => {
    try {
      const { data: pedidoBobinas } = await supabase
        .from('pedidos_bobinas')
        .select('bobina_id')
        .eq('pedido_id', pedidoId);

      if (pedidoBobinas && pedidoBobinas.length > 0) {
        const bobinaIds = pedidoBobinas.map(pb => pb.bobina_id);

        const { error: updateBobinasError } = await supabase
          .from('bobinas')
          .update({
            status: 'em_estoque',
            carga_completa: false
          })
          .in('id', bobinaIds);

        if (updateBobinasError) throw updateBobinasError;
      }

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

      alert('Pedido cancelado com sucesso! As bobinas retornaram ao estoque.');
      await loadPedidosAtivos();
      await loadCrtsCargaCompleta();
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

  const openPedidoModal = async (crt: CrtCargaCompleta) => {
    const firstBobina = crt.bobinas[0];

    const { data: preCadastro } = await supabase
      .from('pre_cadastro')
      .select('ov, oc')
      .eq('numero_crt', crt.numero_crt)
      .maybeSingle();

    setPedidoForm({
      numero_crt: crt.numero_crt,
      numero_oc: preCadastro?.oc || firstBobina.numero_oc || '',
      numero_fatura: firstBobina.numero_fatura || '',
      numero_ov: preCadastro?.ov || firstBobina.numero_ov || '',
      tipo_papel: firstBobina.tipo_papel || '',
      gramatura: firstBobina.gramatura || 0,
      formato_mm: firstBobina.formato_mm || 0,
      quantidade_bobinas: crt.total_bobinas,
      peso_total_kg: crt.peso_total,
      destinos: ['Parana'],
      prioridade: 50
    });

    setSelectedCrt(crt);
    setShowModal(true);
  };

  const savePedido = async () => {
    if (pedidoForm.destinos.length === 0) {
      alert('Por favor, adicione pelo menos um destino');
      return;
    }

    setLoading(true);
    try {
      const { data: pedidoData, error: insertError } = await supabase
        .from('pedidos')
        .insert([{
          numero_crt: pedidoForm.numero_crt,
          numero_oc: pedidoForm.numero_oc,
          numero_fatura: pedidoForm.numero_fatura,
          numero_ov: pedidoForm.numero_ov,
          tipo_papel: pedidoForm.tipo_papel,
          gramatura: pedidoForm.gramatura,
          formato_mm: pedidoForm.formato_mm,
          quantidade_bobinas: pedidoForm.quantidade_bobinas,
          peso_total_kg: pedidoForm.peso_total_kg,
          destino: pedidoForm.destinos[0],
          prioridade: pedidoForm.prioridade,
          status: 'pendente',
          status_pedido: 'recebido',
          dip_processado: false,
          cancelado: false,
          carga_completa: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const destinosData = pedidoForm.destinos.map((destino, index) => ({
        pedido_id: pedidoData.id,
        destino: destino,
        ordem: index + 1
      }));

      const { error: destinosError } = await supabase
        .from('pedidos_destinos')
        .insert(destinosData);

      if (destinosError) throw destinosError;

      if (selectedCrt) {
        const pedidoBobinas = selectedCrt.bobinas.map(bobina => ({
          pedido_id: pedidoData.id,
          bobina_id: bobina.id,
        }));

        const { error: relError } = await supabase
          .from('pedidos_bobinas')
          .insert(pedidoBobinas);

        if (relError) throw relError;
      }

      alert('Pedido gerado com sucesso! Acesse a aba "Status dos Pedidos" para acompanhar.');
      setShowModal(false);
      await loadCrtsCargaCompleta();
      await loadPedidosAtivos();
    } catch (error) {
      console.error('Erro ao gerar pedido:', error);
      alert('Erro ao gerar pedido');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const destinosText = pedidoForm.destinos
      .map((dest, idx) => `Destino ${String(idx + 1).padStart(2, '0')}: ${dest}`)
      .join('\n');

    const doc = `
PEDIDO DE CARREGAMENTO

NÚMERO DO CRT: ${pedidoForm.numero_crt}
OC: ${pedidoForm.numero_oc}
Fatura: ${pedidoForm.numero_fatura}
OV: ${pedidoForm.numero_ov}

ESPECIFICAÇÕES DO PRODUTO:
Tipo de papel: ${pedidoForm.tipo_papel}
Gramatura: ${pedidoForm.gramatura} g/m²
Formato: ${pedidoForm.formato_mm} mm
Quantidade de Bobinas: ${pedidoForm.quantidade_bobinas}
Peso Total: ${pedidoForm.peso_total_kg.toFixed(2)} kg

LOGÍSTICA:
${destinosText}
Prioridade: ${pedidoForm.prioridade}

Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
    `;

    const blob = new Blob([doc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pedido_${pedidoForm.numero_crt}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {pedidosAtivos.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pedidos Ativos</h2>
            <p className="text-sm text-gray-500 mt-1">Pedidos gerados que ainda não foram cancelados</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {pedidosAtivos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="border border-blue-300 bg-blue-50 hover:border-blue-400 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">CRT: {pedido.numero_crt}</p>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-sm text-gray-600">
                              OV: {pedido.numero_ov || 'N/A'} • OC: {pedido.numero_oc || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Fatura: {pedido.numero_fatura || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Quantidade</p>
                          <p className="text-2xl font-bold text-blue-600">{pedido.quantidade_bobinas} bobinas</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Peso Total</p>
                          <p className="text-2xl font-bold text-blue-600">{pedido.peso_total_kg.toFixed(2)} kg</p>
                        </div>
                      </div>

                      {pedido.destinos && pedido.destinos.length > 0 && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Destinos</p>
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

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => openCancelModal(pedido.id, pedido.numero_crt)}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md"
                        >
                          <XCircle className="w-5 h-5" />
                          Cancelar Pedido
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cargas Completas - Prontas para Pedido</h2>
          <p className="text-sm text-gray-500 mt-1">CRTs com todas as bobinas em estoque e marcadas como carga completa</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Carregando...</div>
            </div>
          ) : crtsCargaCompleta.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Nenhuma carga completa disponível</p>
              <p className="text-gray-400 text-sm mt-2">
                Marque as cargas como completas no card "Estoque" para visualizá-las aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {crtsCargaCompleta.map((crt) => (
                <div
                  key={crt.numero_crt}
                  className="border border-green-300 bg-green-50 hover:border-green-400 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                          <Package className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">CRT: {crt.numero_crt}</p>
                          {crt.bobinas[0] && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-sm text-gray-600">
                                OV: {crt.bobinas[0].numero_ov || 'N/A'} • OC: {crt.bobinas[0].numero_oc || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Fatura: {crt.bobinas[0].numero_fatura || 'N/A'}
                              </p>
                              {crt.numero_fatura && (
                                <p className="text-sm text-gray-600">
                                  Fatura: {crt.numero_fatura}
                                </p>
                              )}
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-gray-600">
                                  Tipo: {crt.bobinas[0].tipo_papel || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Gramatura: {crt.bobinas[0].gramatura || 'N/A'} g/m²
                                </p>
                                <p className="text-sm text-gray-600">
                                  Formato: {crt.bobinas[0].formato_mm || 'N/A'} mm
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Quantidade</p>
                          <p className="text-2xl font-bold text-green-600">{crt.total_bobinas} bobinas</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Peso Total</p>
                          <p className="text-2xl font-bold text-green-600">{crt.peso_total.toFixed(2)} kg</p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => openPedidoModal(crt)}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
                        >
                          <FileText className="w-5 h-5" />
                          Gerar Pedido
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Gerar Pedido de Carregamento</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do CRT
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.numero_crt}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OC
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.numero_oc}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fatura
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.numero_fatura}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OV
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.numero_ov}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de papel
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.tipo_papel}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gramatura
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.gramatura}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato (mm)
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.formato_mm}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade de Bobinas
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.quantidade_bobinas}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso Total (kg)
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.peso_total_kg.toFixed(2)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade (1-100) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={pedidoForm.prioridade}
                    onChange={(e) => setPedidoForm({ ...pedidoForm, prioridade: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Destinos <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-500">
                    {pedidoForm.destinos.length} de 4 destinos
                  </span>
                </div>

                <div className="space-y-3">
                  {pedidoForm.destinos.map((destino, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-600 w-24">
                        Destino {String(index + 1).padStart(2, '0')}:
                      </label>
                      <select
                        value={destino}
                        onChange={(e) => {
                          const newDestinos = [...pedidoForm.destinos];
                          newDestinos[index] = e.target.value;
                          setPedidoForm({ ...pedidoForm, destinos: newDestinos });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {destinosOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {pedidoForm.destinos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newDestinos = pedidoForm.destinos.filter((_, i) => i !== index);
                            setPedidoForm({ ...pedidoForm, destinos: newDestinos });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {pedidoForm.destinos.length < 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (pedidoForm.destinos.length < 4) {
                          setPedidoForm({
                            ...pedidoForm,
                            destinos: [...pedidoForm.destinos, 'Parana']
                          });
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Destino
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={savePedido}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  Salvar Pedido
                </button>

                <button
                  onClick={generatePDF}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FileText className="w-5 h-5" />
                  Gerar PDF
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPedido && (
        <CancelModal
          isOpen={cancelModalOpen}
          pedidoId={selectedPedido.id}
          numeroCrt={selectedPedido.numeroCrt}
          onClose={closeCancelModal}
          onConfirm={handleCancelOrder}
        />
      )}
    </div>
  );
}

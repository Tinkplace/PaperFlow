import { useState, useEffect } from 'react';
import { supabase, Bobina, Pedido, CrtVolumeProgramado } from '../lib/supabase';
import { Search, Plus, Check, Package, Truck, X, FileText, CheckCircle, Edit, Save } from 'lucide-react';

interface CrtStatus {
  numero_crt: string;
  bobinas: Bobina[];
  total_bobinas: number;
  bobinas_em_estoque: number;
  bobinas_em_transito: number;
  peso_total: number;
  peso_em_estoque: number;
  peso_em_transito: number;
  status: 'completa' | 'em_transito' | 'em_estoque';
  carga_completa: boolean;
  bobinas_programadas: number;
  peso_programado_kg: number;
}

interface PedidoForm {
  numero_crt: string;
  numero_oc: string;
  numero_proforma: string;
  numero_ov: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  quantidade_bobinas: number;
  peso_total_kg: number;
  destinos: string[];
  prioridade: number;
}

const destinosOptions = [
  'Parana', 'Lujan', 'Arroyito', 'Quilmes', 'San Juan',
  'Cordoba', 'Pilar', 'Buenos Aires', 'Santa Fé', 'Rosário',
  'Mendoza', 'Santiago'
];

export default function Pedidos() {
  const [searchCRT, setSearchCRT] = useState('');
  const [bobinas, setBobinas] = useState<Bobina[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [crtsStatus, setCrtsStatus] = useState<CrtStatus[]>([]);
  const [selectedBobinas, setSelectedBobinas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCrt, setSelectedCrt] = useState<CrtStatus | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [editedBobinas, setEditedBobinas] = useState<Bobina[]>([]);
  const [editedNumeroCrt, setEditedNumeroCrt] = useState('');
  const [justification, setJustification] = useState('');
  const [editingVolumes, setEditingVolumes] = useState<string | null>(null);
  const [tempBobinasProgramadas, setTempBobinasProgramadas] = useState(0);
  const [tempPesoProgramado, setTempPesoProgramado] = useState(0);
  const [pedidoForm, setPedidoForm] = useState<PedidoForm>({
    numero_crt: '',
    numero_oc: '',
    numero_proforma: '',
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
    loadPedidos();
    loadCrtsStatus();
  }, []);

  const loadCrtsStatus = async () => {
    const { data: allBobinas } = await supabase
      .from('bobinas')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: pedidosComCarga } = await supabase
      .from('pedidos')
      .select('numero_crt, carga_completa')
      .eq('carga_completa', true)
      .is('destino', null);

    const { data: pedidosGerados } = await supabase
      .from('pedidos')
      .select('numero_crt')
      .not('destino', 'is', null);

    const { data: volumesProgramados } = await supabase
      .from('crt_volumes_programados')
      .select('*');

    const crtsCargaCompleta = new Set(
      pedidosComCarga?.map(p => p.numero_crt) || []
    );

    const crtsGerados = new Set(
      pedidosGerados?.map(p => p.numero_crt) || []
    );

    const volumesProgramadosMap = new Map(
      volumesProgramados?.map(v => [v.numero_crt, v]) || []
    );

    if (allBobinas) {
      const crtMap = new Map<string, Bobina[]>();

      allBobinas.forEach(bobina => {
        if (bobina.numero_crt) {
          if (!crtMap.has(bobina.numero_crt)) {
            crtMap.set(bobina.numero_crt, []);
          }
          crtMap.get(bobina.numero_crt)!.push(bobina);
        }
      });

      const crtsArray: CrtStatus[] = [];
      crtMap.forEach((bobinas, crt) => {
        if (crtsGerados.has(crt)) {
          return;
        }

        const bobinasEmEstoque = bobinas.filter(b => b.status === 'em_estoque').length;
        const bobinasEmTransito = bobinas.filter(b => b.status === 'em_transito').length;
        const pesoTotal = bobinas.reduce((sum, b) => sum + Number(b.peso_kg), 0);
        const pesoEmEstoque = bobinas
          .filter(b => b.status === 'em_estoque')
          .reduce((sum, b) => sum + Number(b.peso_kg), 0);
        const pesoEmTransito = bobinas
          .filter(b => b.status === 'em_transito')
          .reduce((sum, b) => sum + Number(b.peso_kg), 0);
        const cargaCompletaMarcada = crtsCargaCompleta.has(crt);

        const volumeProgramado = volumesProgramadosMap.get(crt);
        const bobinasProgramadas = volumeProgramado?.bobinas_programadas || 0;
        const pesoProgramadoKg = volumeProgramado?.peso_programado_kg || 0;

        let crtStatus: 'completa' | 'em_transito' | 'em_estoque';
        if (cargaCompletaMarcada) {
          crtStatus = 'completa';
        } else if (bobinasEmTransito > 0) {
          crtStatus = 'em_transito';
        } else {
          crtStatus = 'em_estoque';
        }

        crtsArray.push({
          numero_crt: crt,
          bobinas,
          total_bobinas: bobinas.length,
          bobinas_em_estoque: bobinasEmEstoque,
          bobinas_em_transito: bobinasEmTransito,
          peso_total: pesoTotal,
          peso_em_estoque: pesoEmEstoque,
          peso_em_transito: pesoEmTransito,
          status: crtStatus,
          carga_completa: cargaCompletaMarcada,
          bobinas_programadas: bobinasProgramadas,
          peso_programado_kg: pesoProgramadoKg
        });
      });

      crtsArray.sort((a, b) => {
        if (a.status === 'completa' && b.status !== 'completa') return -1;
        if (a.status !== 'completa' && b.status === 'completa') return 1;
        return 0;
      });

      setCrtsStatus(crtsArray);
    }
  };

  const loadPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPedidos(data);
  };

  const searchByCRT = async () => {
    if (!searchCRT.trim()) return;

    setLoading(true);
    const { data } = await supabase
      .from('bobinas')
      .select('*')
      .eq('numero_crt', searchCRT)
      .order('created_at', { ascending: false });

    if (data) {
      setBobinas(data);
      if (data.length === 0) {
        alert('Nenhuma bobina encontrada para este CRT');
      }
    }
    setLoading(false);
  };

  const toggleBobina = (bobinaId: string) => {
    const newSelected = new Set(selectedBobinas);
    if (newSelected.has(bobinaId)) {
      newSelected.delete(bobinaId);
    } else {
      newSelected.add(bobinaId);
    }
    setSelectedBobinas(newSelected);
  };

  const createPedido = async () => {
    if (selectedBobinas.size === 0) {
      alert('Selecione pelo menos uma bobina');
      return;
    }

    setLoading(true);
    try {
      const firstBobina = bobinas.find(b => selectedBobinas.has(b.id));
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([{
          numero_crt: searchCRT,
          numero_ov: firstBobina?.numero_ov || ''
        }])
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const pedidoBobinas = Array.from(selectedBobinas).map(bobinaId => ({
        pedido_id: pedido.id,
        bobina_id: bobinaId,
      }));

      const { error: relError } = await supabase
        .from('pedidos_bobinas')
        .insert(pedidoBobinas);

      if (relError) throw relError;

      alert('Pedido criado com sucesso!');
      setSelectedBobinas(new Set());
      setBobinas([]);
      setSearchCRT('');
      loadPedidos();
      loadCrtsStatus();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  const loadPedidoBobinas = async (pedidoId: string) => {
    const { data } = await supabase
      .from('pedidos_bobinas')
      .select('bobina_id, bobinas(*)')
      .eq('pedido_id', pedidoId);

    if (data) {
      const bobs = data.map(item => item.bobinas).filter(Boolean) as unknown as Bobina[];
      setBobinas(bobs);
      setSelectedBobinas(new Set(bobs.map(b => b.id)));
    }
  };

  const openPedidoModal = (crt: CrtStatus) => {
    const firstBobina = crt.bobinas[0];

    setPedidoForm({
      numero_crt: crt.numero_crt,
      numero_oc: firstBobina.numero_oc || '',
      numero_proforma: firstBobina.numero_proforma || '',
      numero_ov: firstBobina.numero_ov || '',
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

  const marcarCargaCompleta = async (crt: CrtStatus) => {
    if (crt.carga_completa) {
      alert('Esta carga já foi marcada como completa');
      return;
    }

    setLoading(true);
    try {
      const { data: existingPedido } = await supabase
        .from('pedidos')
        .select('id')
        .eq('numero_crt', crt.numero_crt)
        .eq('carga_completa', true)
        .maybeSingle();

      if (existingPedido) {
        alert('Esta carga já foi marcada como completa anteriormente');
        loadCrtsStatus();
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('pedidos')
        .insert([{
          numero_crt: crt.numero_crt,
          numero_ov: crt.bobinas[0]?.numero_ov || '',
          status: 'pendente',
          status_pedido: 'recebido',
          carga_completa: true
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Carga marcada como completa! Agora você pode gerar o pedido.');
      loadCrtsStatus();
    } catch (error) {
      console.error('Erro ao marcar carga como completa:', error);
      alert('Erro ao marcar carga como completa');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (crt: CrtStatus) => {
    setSelectedCrt(crt);
    setEditedBobinas(JSON.parse(JSON.stringify(crt.bobinas)));
    setEditedNumeroCrt(crt.numero_crt);
    setShowEditModal(true);
  };

  const updateBobinaField = (index: number, field: keyof Bobina, value: any) => {
    const updated = [...editedBobinas];
    updated[index] = { ...updated[index], [field]: value };
    setEditedBobinas(updated);
  };

  const saveEdits = () => {
    setShowEditModal(false);
    setShowJustificationModal(true);
  };

  const confirmSaveWithJustification = async () => {
    if (!justification.trim()) {
      alert('Por favor, insira uma justificativa para as alterações');
      return;
    }

    setLoading(true);
    try {
      const crtChanged = editedNumeroCrt !== selectedCrt!.numero_crt;

      if (crtChanged) {
        await supabase
          .from('bobinas')
          .update({ numero_crt: editedNumeroCrt })
          .eq('numero_crt', selectedCrt!.numero_crt);

        await supabase
          .from('crt_edit_history')
          .insert([{
            numero_crt: selectedCrt!.numero_crt,
            bobina_id: null,
            field_name: 'numero_crt',
            old_value: selectedCrt!.numero_crt,
            new_value: editedNumeroCrt,
            justification: justification,
            edited_by: 'user'
          }]);

        await supabase
          .from('pedidos')
          .update({ numero_crt: editedNumeroCrt })
          .eq('numero_crt', selectedCrt!.numero_crt);
      }

      for (let i = 0; i < editedBobinas.length; i++) {
        const original = selectedCrt!.bobinas[i];
        const edited = editedBobinas[i];
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

        (Object.keys(edited) as Array<keyof Bobina>).forEach(key => {
          if (original[key] !== edited[key] &&
              key !== 'id' &&
              key !== 'created_at' &&
              key !== 'updated_at') {
            changes.push({
              field: key,
              oldValue: String(original[key] || ''),
              newValue: String(edited[key] || '')
            });
          }
        });

        if (changes.length > 0) {
          const { error: updateError } = await supabase
            .from('bobinas')
            .update(edited)
            .eq('id', edited.id);

          if (updateError) throw updateError;

          for (const change of changes) {
            await supabase
              .from('crt_edit_history')
              .insert([{
                numero_crt: crtChanged ? editedNumeroCrt : selectedCrt!.numero_crt,
                bobina_id: edited.id,
                field_name: change.field,
                old_value: change.oldValue,
                new_value: change.newValue,
                justification: justification,
                edited_by: 'user'
              }]);
          }
        }
      }

      alert('Alterações salvas com sucesso!');
      setShowJustificationModal(false);
      setJustification('');
      setEditedBobinas([]);
      setEditedNumeroCrt('');
      setSelectedCrt(null);
      loadCrtsStatus();
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  const savePedido = async () => {
    if (pedidoForm.destinos.length === 0) {
      alert('Por favor, adicione pelo menos um destino');
      return;
    }

    if (!selectedCrt?.carga_completa) {
      alert('Por favor, marque a carga como completa antes de gerar o pedido');
      return;
    }

    setLoading(true);
    try {
      const { data: pedidoData, error: selectError } = await supabase
        .from('pedidos')
        .select('id')
        .eq('numero_crt', pedidoForm.numero_crt)
        .eq('carga_completa', true)
        .maybeSingle();

      if (selectError) throw selectError;

      if (!pedidoData) {
        alert('Erro: Pedido não encontrado. Por favor, marque a carga como completa novamente.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          numero_oc: pedidoForm.numero_oc,
          numero_proforma: pedidoForm.numero_proforma,
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
          cancelado: false
        })
        .eq('id', pedidoData.id);

      if (updateError) throw updateError;

      const { error: deleteDestinosError } = await supabase
        .from('pedidos_destinos')
        .delete()
        .eq('pedido_id', pedidoData.id);

      if (deleteDestinosError) throw deleteDestinosError;

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
        const { data: existingRelations } = await supabase
          .from('pedidos_bobinas')
          .select('bobina_id')
          .eq('pedido_id', pedidoData.id);

        if (!existingRelations || existingRelations.length === 0) {
          const pedidoBobinas = selectedCrt.bobinas.map(bobina => ({
            pedido_id: pedidoData.id,
            bobina_id: bobina.id,
          }));

          const { error: relError } = await supabase
            .from('pedidos_bobinas')
            .insert(pedidoBobinas);

          if (relError) throw relError;
        }
      }

      alert('Pedido gerado com sucesso! Acesse a aba "Status dos Pedidos" para acompanhar.');
      setShowModal(false);
      await loadPedidos();
      await loadCrtsStatus();
    } catch (error) {
      console.error('Erro ao gerar pedido:', error);
      alert('Erro ao gerar pedido');
    } finally {
      setLoading(false);
    }
  };

  const startEditVolumes = (crt: CrtStatus) => {
    setEditingVolumes(crt.numero_crt);
    setTempBobinasProgramadas(crt.bobinas_programadas);
    setTempPesoProgramado(crt.peso_programado_kg);
  };

  const cancelEditVolumes = () => {
    setEditingVolumes(null);
    setTempBobinasProgramadas(0);
    setTempPesoProgramado(0);
  };

  const saveVolumes = async (numeroCrt: string) => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('crt_volumes_programados')
        .select('id')
        .eq('numero_crt', numeroCrt)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('crt_volumes_programados')
          .update({
            bobinas_programadas: tempBobinasProgramadas,
            peso_programado_kg: tempPesoProgramado,
            updated_at: new Date().toISOString()
          })
          .eq('numero_crt', numeroCrt);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crt_volumes_programados')
          .insert({
            numero_crt: numeroCrt,
            bobinas_programadas: tempBobinasProgramadas,
            peso_programado_kg: tempPesoProgramado
          });

        if (error) throw error;
      }

      alert('Volumes programados salvos com sucesso!');
      setEditingVolumes(null);
      setTempBobinasProgramadas(0);
      setTempPesoProgramado(0);
      loadCrtsStatus();
    } catch (error) {
      console.error('Erro ao salvar volumes programados:', error);
      alert('Erro ao salvar volumes programados');
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
Proforma: ${pedidoForm.numero_proforma}
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Buscar CRT</h2>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchCRT}
                onChange={(e) => setSearchCRT(e.target.value)}
                placeholder="Buscar por número CRT"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && searchByCRT()}
              />
            </div>
            <button
              onClick={searchByCRT}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {bobinas.length > 0 && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Sel.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Bobina
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Gramatura
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Formato
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Peso (kg)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bobinas.map((bobina) => (
                        <tr key={bobina.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedBobinas.has(bobina.id)}
                              onChange={() => toggleBobina(bobina.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {bobina.numero_bobina}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {bobina.tipo_papel}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {bobina.gramatura}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {bobina.formato_mm}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {bobina.peso_kg}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={createPedido}
                disabled={loading || selectedBobinas.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Criar Pedido ({selectedBobinas.size} bobinas)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Estoque Armazém</h2>
          <p className="text-sm text-gray-500 mt-1">Controle de cargas completas e em trânsito por CRT</p>
        </div>

        <div className="p-6">
          {crtsStatus.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum CRT encontrado</p>
          ) : (
            <div className="space-y-3">
              {crtsStatus.map((crt) => (
                <div
                  key={crt.numero_crt}
                  className={`border rounded-lg p-4 transition-all ${
                    crt.status === 'completa'
                      ? 'border-green-300 bg-green-50 hover:border-green-400'
                      : crt.status === 'em_transito'
                      ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400'
                      : 'border-blue-300 bg-blue-50 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          crt.status === 'completa'
                            ? 'bg-green-100'
                            : crt.status === 'em_transito'
                            ? 'bg-yellow-100'
                            : 'bg-blue-100'
                        }`}>
                          {crt.status === 'completa' ? (
                            <Package className="w-5 h-5 text-green-600" />
                          ) : crt.status === 'em_transito' ? (
                            <Truck className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <Package className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">CRT: {crt.numero_crt}</p>
                          {crt.bobinas[0] && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-sm text-gray-600">
                                Proforma: {crt.bobinas[0].numero_proforma || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">
                                OV: {crt.bobinas[0].numero_ov || 'N/A'}
                              </p>
                              <div className="flex gap-4 mt-1">
                                <p className="text-sm text-gray-600">
                                  Tipo: {crt.bobinas[0].tipo_papel || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Gram: {crt.bobinas[0].gramatura || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Formato: {crt.bobinas[0].formato_mm || 'N/A'} mm
                                </p>
                              </div>
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {crt.status === 'completa' ? 'Carga Completa' :
                             crt.status === 'em_transito' ? 'Carga em Trânsito' : 'Em Estoque'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-200" colSpan={2}>
                                  Volumes Programados
                                </th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-200" colSpan={2}>
                                  Vol. Armazenados
                                </th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center" colSpan={2}>
                                  Saldo em Trânsito
                                </th>
                              </tr>
                              <tr className="border-t border-gray-200">
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-100 w-1/6">Bob.</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-200 w-1/6">Kgr.</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-100 w-1/6">Bob.</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-200 w-1/6">Kgr.</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center border-r border-gray-100 w-1/6">Bob.</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 text-center w-1/6">Kg.</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="bg-white">
                                {editingVolumes === crt.numero_crt ? (
                                  <>
                                    <td className="px-3 py-3 text-center border-r border-gray-100">
                                      <input
                                        type="number"
                                        value={tempBobinasProgramadas}
                                        onChange={(e) => setTempBobinasProgramadas(parseInt(e.target.value) || 0)}
                                        className="w-full px-2 py-1 text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                      />
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-gray-200">
                                      <input
                                        type="number"
                                        value={tempPesoProgramado}
                                        onChange={(e) => setTempPesoProgramado(parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1 text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-3 text-center border-r border-gray-100">
                                      <span className="text-lg font-bold text-gray-900">{crt.bobinas_programadas || 0}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center border-r border-gray-200">
                                      <span className="text-lg font-bold text-gray-900">{crt.peso_programado_kg ? crt.peso_programado_kg.toFixed(0) : 0}</span>
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-3 text-center border-r border-gray-100">
                                  <span className="text-lg font-bold text-green-600">{crt.bobinas_em_estoque}</span>
                                </td>
                                <td className="px-3 py-3 text-center border-r border-gray-200">
                                  <span className="text-lg font-bold text-green-600">{crt.peso_em_estoque.toFixed(0)}</span>
                                </td>
                                <td className="px-3 py-3 text-center border-r border-gray-100">
                                  <span className="text-lg font-bold text-yellow-600">
                                    {crt.bobinas_programadas > 0
                                      ? Math.max(0, crt.bobinas_programadas - crt.bobinas_em_estoque)
                                      : crt.bobinas_em_transito}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="text-lg font-bold text-yellow-600">
                                    {crt.peso_programado_kg > 0
                                      ? Math.max(0, crt.peso_programado_kg - crt.peso_em_estoque).toFixed(0)
                                      : crt.peso_em_transito.toFixed(0)}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {editingVolumes === crt.numero_crt ? (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => saveVolumes(crt.numero_crt)}
                              disabled={loading}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              Salvar
                            </button>
                            <button
                              onClick={cancelEditVolumes}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditVolumes(crt)}
                            className="flex items-center gap-2 px-4 py-2 mt-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Editar Volumes Programados
                          </button>
                        )}
                      </div>

                      {crt.status === 'completa' && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                            <Check className="w-4 h-4" />
                            Todas as bobinas recebidas - Pronto para carregamento
                          </div>

                          {crt.carga_completa ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-100 px-3 py-2 rounded-lg">
                                <CheckCircle className="w-5 h-5" />
                                Carga Completa Confirmada
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditModal(crt)}
                                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar CRT
                                </button>
                                <button
                                  onClick={() => openPedidoModal(crt)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  <FileText className="w-4 h-4" />
                                  Gerar Pedido
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-amber-600 font-medium">
                                Marque a carga como completa antes de gerar o pedido
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditModal(crt)}
                                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar CRT
                                </button>
                                <button
                                  onClick={() => marcarCargaCompleta(crt)}
                                  disabled={loading}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Carga Completa
                                </button>
                                <button
                                  onClick={() => openPedidoModal(crt)}
                                  disabled
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                                >
                                  <FileText className="w-4 h-4" />
                                  Gerar Pedido
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {crt.status === 'em_estoque' && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                            <Package className="w-4 h-4" />
                            Todas as bobinas em estoque
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-amber-600 font-medium">
                              Marque a carga como completa antes de gerar o pedido
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditModal(crt)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                              >
                                <Edit className="w-4 h-4" />
                                Editar CRT
                              </button>
                              <button
                                onClick={() => marcarCargaCompleta(crt)}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Carga Completa
                              </button>
                              <button
                                onClick={() => openPedidoModal(crt)}
                                disabled
                                className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                Gerar Pedido
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {crt.status === 'em_transito' && (
                        <div className="mt-3 text-sm text-yellow-700 font-medium">
                          Aguardando chegada de {crt.bobinas_em_transito} bobina(s)
                        </div>
                      )}
                    </div>

                    <div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        crt.status === 'completa'
                          ? 'bg-green-600 text-white'
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {crt.status === 'completa' ? 'COMPLETA' : 'EM TRÂNSITO'}
                      </span>
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
                    Proforma
                  </label>
                  <input
                    type="text"
                    value={pedidoForm.numero_proforma}
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

      {showEditModal && selectedCrt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Editar CRT: {selectedCrt.numero_crt}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditedBobinas([]);
                  setEditedNumeroCrt('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do CRT
                </label>
                <input
                  type="text"
                  value={editedNumeroCrt}
                  onChange={(e) => setEditedNumeroCrt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o número do CRT"
                />
                <p className="mt-2 text-xs text-gray-600">
                  Alterações no número do CRT serão aplicadas a todas as bobinas deste CRT
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bobina</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° OV</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° OC</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proforma</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Papel</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gramatura</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formato (mm)</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peso (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editedBobinas.map((bobina, index) => (
                      <tr key={bobina.id}>
                        <td className="px-3 py-3 text-sm text-gray-900">{bobina.numero_bobina}</td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={bobina.numero_ov || ''}
                            onChange={(e) => updateBobinaField(index, 'numero_ov', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={bobina.numero_oc || ''}
                            onChange={(e) => updateBobinaField(index, 'numero_oc', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={bobina.numero_proforma || ''}
                            onChange={(e) => updateBobinaField(index, 'numero_proforma', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={bobina.tipo_papel || ''}
                            onChange={(e) => updateBobinaField(index, 'tipo_papel', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={bobina.gramatura || ''}
                            onChange={(e) => updateBobinaField(index, 'gramatura', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={bobina.formato_mm || ''}
                            onChange={(e) => updateBobinaField(index, 'formato_mm', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={bobina.peso_kg || ''}
                            onChange={(e) => updateBobinaField(index, 'peso_kg', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditedBobinas([]);
                    setEditedNumeroCrt('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdits}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Justificativa da Alteração</h2>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Por favor, informe o motivo das alterações realizadas no CRT:
              </p>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Digite a justificativa..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowJustificationModal(false);
                    setJustification('');
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmSaveWithJustification}
                  disabled={!justification.trim() || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

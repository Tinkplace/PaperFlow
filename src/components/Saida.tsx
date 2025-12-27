import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Truck } from 'lucide-react';

interface Romaneio {
  id: string;
  data_carregamento: string;
  nome_motorista: string;
  placa_carreta: string;
  numero_crt: string | null;
  numero_fatura: string | null;
  destino: string;
  data_hora_saida: string | null;
}

export default function Saida() {
  const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRomaneioId, setSelectedRomaneioId] = useState<string>('');
  const [dataHoraSaida, setDataHoraSaida] = useState<string>('');

  useEffect(() => {
    loadRomaneioPendentes();
  }, []);

  const loadRomaneioPendentes = async () => {
    const { data, error } = await supabase
      .from('romaneios')
      .select('*')
      .is('data_hora_saida', null)
      .order('data_carregamento', { ascending: false });

    if (error) {
      console.error('Erro ao carregar romaneios pendentes:', error);
      return;
    }

    if (data) {
      setRomaneios(data);
    }
  };

  const handleConfirmarSaida = async () => {
    if (!selectedRomaneioId || !dataHoraSaida) {
      alert('Selecione um romaneio e informe a data/hora da saída');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('romaneios')
        .update({ data_hora_saida: dataHoraSaida })
        .eq('id', selectedRomaneioId);

      if (updateError) throw updateError;

      const { data: romaneioBobinas, error: relError } = await supabase
        .from('romaneios_bobinas')
        .select('bobina_id')
        .eq('romaneio_id', selectedRomaneioId);

      if (relError) throw relError;

      if (romaneioBobinas && romaneioBobinas.length > 0) {
        const bobinasIds = romaneioBobinas.map(rb => rb.bobina_id);

        const { error: bobinaUpdateError } = await supabase
          .from('bobinas')
          .update({ status: 'carregado' })
          .in('id', bobinasIds);

        if (bobinaUpdateError) throw bobinaUpdateError;
      }

      alert('Saída registrada com sucesso!');
      setSelectedRomaneioId('');
      setDataHoraSaida('');
      loadRomaneioPendentes();
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      alert(`Erro ao registrar saída: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedRomaneio = romaneios.find(r => r.id === selectedRomaneioId);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Registro de Saída</h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o Romaneio *
          </label>
          <select
            value={selectedRomaneioId}
            onChange={(e) => setSelectedRomaneioId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um romaneio pendente</option>
            {romaneios.map((romaneio) => (
              <option key={romaneio.id} value={romaneio.id}>
                {romaneio.numero_crt ? `CRT: ${romaneio.numero_crt}` : `Romaneio ID: ${romaneio.id}`} -
                {romaneio.destino} -
                Motorista: {romaneio.nome_motorista} -
                Placa: {romaneio.placa_carreta}
              </option>
            ))}
          </select>
        </div>

        {romaneios.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-yellow-600" />
              Romaneios Pendentes de Saída ({romaneios.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CRT / Fatura
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destino
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motorista
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Placa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Carregamento
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {romaneios.map((romaneio) => (
                    <tr
                      key={romaneio.id}
                      className={`hover:bg-blue-50 transition-colors ${
                        selectedRomaneioId === romaneio.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">
                          {romaneio.numero_crt || '-'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {romaneio.numero_fatura || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {romaneio.destino}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {romaneio.nome_motorista}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                        {romaneio.placa_carreta}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(romaneio.data_carregamento).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Aguardando Saída
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedRomaneio && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Detalhes do Romaneio Selecionado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedRomaneio.numero_crt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número CRT
                  </label>
                  <input
                    type="text"
                    value={selectedRomaneio.numero_crt}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                  />
                </div>
              )}

              {selectedRomaneio.numero_fatura && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número Fatura
                  </label>
                  <input
                    type="text"
                    value={selectedRomaneio.numero_fatura}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destino
                </label>
                <input
                  type="text"
                  value={selectedRomaneio.destino}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Motorista
                </label>
                <input
                  type="text"
                  value={selectedRomaneio.nome_motorista}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa da Carreta
                </label>
                <input
                  type="text"
                  value={selectedRomaneio.placa_carreta}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data/Hora Carregamento
                </label>
                <input
                  type="text"
                  value={new Date(selectedRomaneio.data_carregamento).toLocaleString('pt-BR')}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Data/Hora da Saída *
                </label>
                <input
                  type="datetime-local"
                  value={dataHoraSaida}
                  onChange={(e) => setDataHoraSaida(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmarSaida}
              disabled={loading || !dataHoraSaida}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="w-5 h-5" />
              {loading ? 'Registrando...' : 'Confirmar Saída'}
            </button>
          </div>
        )}

        {romaneios.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum romaneio pendente de saída</p>
          </div>
        )}
      </div>
    </div>
  );
}

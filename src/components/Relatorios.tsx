import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Truck, Clock, TrendingUp, X } from 'lucide-react';

interface CrtData {
  numero_crt: string;
  numero_fatura: string;
  status: string;
  bobinas_count: number;
  peso_total: number;
}

interface Stats {
  em_estoque: number;
  carregado: number;
  em_transito: number;
  peso_total_estoque: number;
}

interface DetailedProductData {
  numero_crt: string;
  numero_oc: string;
  numero_fatura: string;
  numero_ov: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  volumes_programados_bob: number;
  volumes_programados_kg: number;
  volumes_armazenados_bob: number;
  volumes_armazenados_kg: number;
  saldo_transito_bob: number;
  saldo_transito_kg: number;
  dip_processado: boolean;
}

export default function Relatorios() {
  const [stats, setStats] = useState<Stats>({
    em_estoque: 0,
    carregado: 0,
    em_transito: 0,
    peso_total_estoque: 0,
  });

  const [crtsEstoque, setCrtsEstoque] = useState<CrtData[]>([]);
  const [crtsCarregados, setCrtsCarregados] = useState<CrtData[]>([]);
  const [crtsTransito, setCrtsTransito] = useState<CrtData[]>([]);
  const [detailedData, setDetailedData] = useState<DetailedProductData[]>([]);
  const [activeView, setActiveView] = useState<'estoque' | 'carregado' | 'transito' | 'total'>('estoque');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; crts: CrtData[] }>({ title: '', crts: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: allBobinas } = await supabase
      .from('bobinas')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: allPedidos } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (allBobinas) {
      const crtMap = new Map<string, { status: string; bobinas: typeof allBobinas; numero_fatura?: string }>();

      allBobinas.forEach(bobina => {
        const crt = bobina.numero_crt || 'SEM_CRT';
        if (!crtMap.has(crt)) {
          crtMap.set(crt, { status: bobina.status, bobinas: [], numero_fatura: bobina.numero_fatura });
        }
        const entry = crtMap.get(crt)!;
        if (bobina.status) {
          entry.status = bobina.status;
        }
        entry.bobinas.push(bobina);
      });

      const estoqueCrts: CrtData[] = [];
      const carregadosCrts: CrtData[] = [];
      const transitoCrts: CrtData[] = [];
      let pesoEstoque = 0;

      crtMap.forEach((value, crt) => {
        const peso_total = value.bobinas.reduce((sum, b) => sum + Number(b.peso_kg), 0);
        const crtData: CrtData = {
          numero_crt: crt,
          numero_fatura: value.numero_fatura || crt,
          status: value.status,
          bobinas_count: value.bobinas.length,
          peso_total,
        };

        if (value.status === 'em_estoque') {
          estoqueCrts.push(crtData);
          pesoEstoque += peso_total;
        } else if (value.status === 'carregado') {
          carregadosCrts.push(crtData);
        } else if (value.status === 'em_transito') {
          transitoCrts.push(crtData);
        }
      });

      setStats({
        em_estoque: estoqueCrts.length,
        carregado: carregadosCrts.length,
        em_transito: transitoCrts.length,
        peso_total_estoque: pesoEstoque,
      });

      setCrtsEstoque(estoqueCrts);
      setCrtsCarregados(carregadosCrts);
      setCrtsTransito(transitoCrts);

      if (allPedidos && allBobinas) {
        const detailedProductMap = new Map<string, DetailedProductData>();

        allPedidos.forEach(pedido => {
          const key = `${pedido.numero_crt || ''}-${pedido.numero_oc || ''}-${pedido.numero_fatura || ''}-${pedido.tipo_papel || ''}-${pedido.gramatura || 0}-${pedido.formato_mm || 0}`;

          const bobinasRelacionadas = allBobinas.filter(
            b => b.numero_crt === pedido.numero_crt &&
                 b.numero_oc === pedido.numero_oc &&
                 b.numero_fatura === pedido.numero_fatura &&
                 b.tipo_papel === pedido.tipo_papel &&
                 b.gramatura === pedido.gramatura &&
                 b.formato_mm === pedido.formato_mm
          );

          const bobinasEstoque = bobinasRelacionadas.filter(b => b.status === 'em_estoque');
          const bobinasTransito = bobinasRelacionadas.filter(b => b.status === 'em_transito');

          const volumes_armazenados_bob = bobinasEstoque.length;
          const volumes_armazenados_kg = bobinasEstoque.reduce((sum, b) => sum + Number(b.peso_kg), 0);
          const saldo_transito_bob = bobinasTransito.length;
          const saldo_transito_kg = bobinasTransito.reduce((sum, b) => sum + Number(b.peso_kg), 0);

          detailedProductMap.set(key, {
            numero_crt: pedido.numero_crt || '-',
            numero_oc: pedido.numero_oc || '-',
            numero_fatura: pedido.numero_fatura || '-',
            numero_ov: pedido.numero_ov || '-',
            tipo_papel: pedido.tipo_papel || '-',
            gramatura: pedido.gramatura || 0,
            formato_mm: pedido.formato_mm || 0,
            volumes_programados_bob: pedido.quantidade_bobinas || 0,
            volumes_programados_kg: Number(pedido.peso_total_kg) || 0,
            volumes_armazenados_bob,
            volumes_armazenados_kg,
            saldo_transito_bob,
            saldo_transito_kg,
            dip_processado: pedido.dip_processado || false,
          });
        });

        setDetailedData(Array.from(detailedProductMap.values()));
      }
    }
  };

  const getCurrentCrts = () => {
    switch (activeView) {
      case 'estoque':
        return crtsEstoque;
      case 'carregado':
        return crtsCarregados;
      case 'transito':
        return crtsTransito;
      case 'total':
        return [...crtsEstoque, ...crtsCarregados, ...crtsTransito];
      default:
        return [];
    }
  };

  const openModal = (title: string, crts: CrtData[]) => {
    setModalData({ title, crts });
    setShowModal(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'em_estoque':
        return 'Em Estoque';
      case 'carregado':
        return 'Carregado';
      case 'em_transito':
        return 'Em Trânsito';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => openModal('Em Estoque', crtsEstoque)}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Estoque</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.em_estoque}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.peso_total_estoque.toFixed(0)} kg
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => openModal('Carregado', crtsCarregados)}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Carregado</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.carregado}</p>
              <p className="text-sm text-gray-500 mt-1">CRTs</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => openModal('Em Trânsito', crtsTransito)}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Trânsito</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.em_transito}</p>
              <p className="text-sm text-gray-500 mt-1">CRTs</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </button>

        <button
          onClick={() => openModal('Total Geral', [...crtsEstoque, ...crtsCarregados, ...crtsTransito])}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Geral</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.em_estoque + stats.carregado + stats.em_transito}
              </p>
              <p className="text-sm text-gray-500 mt-1">CRTs</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveView('estoque')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'estoque'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Em Estoque ({stats.em_estoque})
            </button>
            <button
              onClick={() => setActiveView('carregado')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'carregado'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Carregadas ({stats.carregado})
            </button>
            <button
              onClick={() => setActiveView('transito')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'transito'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Em Trânsito ({stats.em_transito})
            </button>
          </div>
        </div>

        <div className="p-6">
          {getCurrentCrts().length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum CRT encontrado nesta categoria
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CRT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fatura
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bobinas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Peso Total (kg)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentCrts().map((crt) => (
                    <tr key={crt.numero_crt} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {crt.numero_crt}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {crt.numero_fatura || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {crt.bobinas_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {Number(crt.peso_total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          crt.status === 'em_estoque'
                            ? 'bg-blue-100 text-blue-800'
                            : crt.status === 'carregado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getStatusLabel(crt.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mt-6">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-white bg-[#1A2441] px-4 py-2 rounded">
            Dados do Produto
          </h3>
        </div>
        <div className="overflow-x-auto">
          {detailedData.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Nenhum dado disponível
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    CRT
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    OC
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    Fatura
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    OV
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    Tipo de Papel
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    Gram.
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    Formato
                  </th>
                  <th colSpan={2} className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-blue-50 border border-gray-300">
                    Volumes Programados
                  </th>
                  <th colSpan={2} className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-green-50 border border-gray-300">
                    Vol. Armazenados
                  </th>
                  <th colSpan={2} className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-yellow-50 border border-gray-300">
                    Saldo em Trânsito
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase border border-gray-300">
                    Ok Despachante
                  </th>
                </tr>
                <tr>
                  <th className="border border-gray-300"></th>
                  <th className="border border-gray-300"></th>
                  <th className="border border-gray-300"></th>
                  <th className="border border-gray-300"></th>
                  <th className="border border-gray-300"></th>
                  <th className="border border-gray-300"></th>
                  <th className="border border-gray-300"></th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50 border border-gray-300">
                    Bob.
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50 border border-gray-300">
                    Kgr
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50 border border-gray-300">
                    Bob.
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50 border border-gray-300">
                    Kgr
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-yellow-50 border border-gray-300">
                    Bob.
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-yellow-50 border border-gray-300">
                    Kg
                  </th>
                  <th className="border border-gray-300"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detailedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.numero_crt}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.numero_oc}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.numero_fatura}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.numero_ov}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.tipo_papel}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.gramatura}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 border border-gray-300">
                      {item.formato_mm}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 bg-blue-50 border border-gray-300">
                      {item.volumes_programados_bob}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 bg-blue-50 border border-gray-300">
                      {item.volumes_programados_kg.toFixed(0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 bg-green-50 border border-gray-300">
                      {item.volumes_armazenados_bob}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 bg-green-50 border border-gray-300">
                      {item.volumes_armazenados_kg.toFixed(0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 bg-yellow-50 border border-gray-300">
                      {item.saldo_transito_bob}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 bg-yellow-50 border border-gray-300">
                      {item.saldo_transito_kg.toFixed(0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-center border border-gray-300">
                      {item.dip_processado ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{modalData.title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {modalData.crts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhum CRT encontrado nesta categoria
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          CRT
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Fatura
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Bobinas
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Peso Total (kg)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {modalData.crts.map((crt) => (
                        <tr key={crt.numero_crt} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {crt.numero_crt}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {crt.numero_fatura || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {crt.bobinas_count}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {Number(crt.peso_total).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              crt.status === 'em_estoque'
                                ? 'bg-blue-100 text-blue-800'
                                : crt.status === 'carregado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getStatusLabel(crt.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

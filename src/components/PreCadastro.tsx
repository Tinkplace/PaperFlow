import { useState, useEffect } from 'react';
import { Save, Edit2, Plus, Trash2, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PreCadastroData {
  id?: string;
  numero_crt: string;
  ov: string;
  oc: string;
  exportador: string;
  importador: string;
  origem: string;
  data_emissao_crt: string;
  volumes_programados_qtd: number;
  volumes_programados_kg: number;
}

interface DeleteModalData {
  id: string;
  numero_crt: string;
  bobinasCount: number;
  notasFiscaisCount: number;
}

export default function PreCadastro() {
  const [registros, setRegistros] = useState<PreCadastroData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filtroCrt, setFiltroCrt] = useState('');
  const [filtroOv, setFiltroOv] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<PreCadastroData>({
    numero_crt: '',
    ov: '',
    oc: '',
    exportador: '',
    importador: '',
    origem: '',
    data_emissao_crt: '',
    volumes_programados_qtd: 0,
    volumes_programados_kg: 0,
  });

  useEffect(() => {
    loadRegistros();
  }, []);

  const loadRegistros = async () => {
    const { data, error } = await supabase
      .from('pre_cadastro')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar registros:', error);
    } else {
      setRegistros(data || []);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'volumes_programados_qtd' || name === 'volumes_programados_kg'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSave = async () => {
    if (!formData.numero_crt) {
      alert('Por favor, preencha o Número do CRT');
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('pre_cadastro')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Registro atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('pre_cadastro')
          .insert([formData]);

        if (error) throw error;
        alert('Registro salvo com sucesso!');
      }

      resetForm();
      loadRegistros();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (registro: PreCadastroData) => {
    setFormData({
      numero_crt: registro.numero_crt,
      ov: registro.ov,
      oc: registro.oc,
      exportador: registro.exportador,
      importador: registro.importador,
      origem: registro.origem,
      data_emissao_crt: registro.data_emissao_crt,
      volumes_programados_qtd: registro.volumes_programados_qtd,
      volumes_programados_kg: registro.volumes_programados_kg,
    });
    setEditingId(registro.id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string, numero_crt: string) => {
    setDeleteLoading(true);

    try {
      const { count: bobinasCount } = await supabase
        .from('bobinas')
        .select('*', { count: 'exact', head: true })
        .eq('numero_crt', numero_crt);

      const { count: notasFiscaisCount } = await supabase
        .from('notas_fiscais')
        .select('*', { count: 'exact', head: true })
        .eq('numero_crt', numero_crt);

      setDeleteModalData({
        id,
        numero_crt,
        bobinasCount: bobinasCount || 0,
        notasFiscaisCount: notasFiscaisCount || 0,
      });
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      alert('Erro ao carregar informações para exclusão');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!justificativa.trim()) {
      alert('Por favor, insira uma justificativa para a exclusão');
      return;
    }

    if (!deleteModalData) return;

    setDeleteLoading(true);

    try {
      const totalRegistros = 1 + deleteModalData.bobinasCount + deleteModalData.notasFiscaisCount;

      const { error: bobinasError } = await supabase
        .from('bobinas')
        .delete()
        .eq('numero_crt', deleteModalData.numero_crt);

      if (bobinasError) throw bobinasError;

      const { error: notasError } = await supabase
        .from('notas_fiscais')
        .delete()
        .eq('numero_crt', deleteModalData.numero_crt);

      if (notasError) throw notasError;

      const { error: preError } = await supabase
        .from('pre_cadastro')
        .delete()
        .eq('id', deleteModalData.id);

      if (preError) throw preError;

      const { error: logError } = await supabase
        .from('exclusao_log')
        .insert({
          numero_crt: deleteModalData.numero_crt,
          justificativa: justificativa.trim(),
          bobinas_excluidas: deleteModalData.bobinasCount,
          notas_fiscais_excluidas: deleteModalData.notasFiscaisCount,
          total_registros_excluidos: totalRegistros,
        });

      if (logError) {
        console.error('Erro ao registrar log:', logError);
      }

      alert('Todos os registros do CRT foram excluídos com sucesso!');
      setShowDeleteModal(false);
      setDeleteModalData(null);
      setJustificativa('');
      loadRegistros();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir registros: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteModalData(null);
    setJustificativa('');
  };

  const resetForm = () => {
    setFormData({
      numero_crt: '',
      ov: '',
      oc: '',
      exportador: '',
      importador: '',
      origem: '',
      data_emissao_crt: '',
      volumes_programados_qtd: 0,
      volumes_programados_kg: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const registrosFiltrados = registros.filter((registro) => {
    const matchCrt = filtroCrt === '' || registro.numero_crt.toLowerCase().includes(filtroCrt.toLowerCase());
    const matchOv = filtroOv === '' || registro.ov.toLowerCase().includes(filtroOv.toLowerCase());
    return matchCrt && matchOv;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Pré-Cadastro de CRT</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A2441] text-white rounded-lg hover:bg-[#2A3451] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Registro
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {editingId ? 'Editar Registro' : 'Novo Registro'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número do CRT *
              </label>
              <input
                type="text"
                name="numero_crt"
                value={formData.numero_crt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="Ex: CRT-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OV (Ordem de Venda)
              </label>
              <input
                type="text"
                name="ov"
                value={formData.ov}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="Ex: OV-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OC (Ordem de Compra)
              </label>
              <input
                type="text"
                name="oc"
                value={formData.oc}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="Ex: OC-67890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exportador
              </label>
              <input
                type="text"
                name="exportador"
                value={formData.exportador}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="Nome do exportador"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Importador
              </label>
              <input
                type="text"
                name="importador"
                value={formData.importador}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="Nome do importador"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origem
              </label>
              <input
                type="text"
                name="origem"
                value={formData.origem}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="País de origem"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Emissão do CRT
              </label>
              <input
                type="date"
                name="data_emissao_crt"
                value={formData.data_emissao_crt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volumes Programados (Qtd. Bobinas)
              </label>
              <input
                type="number"
                name="volumes_programados_qtd"
                value={formData.volumes_programados_qtd}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volumes Programados (Kg Total)
              </label>
              <input
                type="number"
                name="volumes_programados_kg"
                value={formData.volumes_programados_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Search className="w-5 h-5" />
            <span className="font-medium">Filtros:</span>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Buscar por Número do CRT..."
                value={filtroCrt}
                onChange={(e) => setFiltroCrt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Buscar por OV..."
                value={filtroOv}
                onChange={(e) => setFiltroOv(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2441] focus:border-transparent"
              />
            </div>
          </div>
          {(filtroCrt || filtroOv) && (
            <button
              onClick={() => {
                setFiltroCrt('');
                setFiltroOv('');
              }}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número CRT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exportador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Emissão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vol. Prog. (Qtd)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vol. Prog. (Kg)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    {registros.length === 0
                      ? 'Nenhum registro encontrado. Clique em "Novo Registro" para adicionar.'
                      : 'Nenhum registro corresponde aos filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((registro) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {registro.numero_crt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.ov}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.oc}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.exportador}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.importador}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.origem}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.data_emissao_crt ? new Date(registro.data_emissao_crt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.volumes_programados_qtd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {registro.volumes_programados_kg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(registro)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(registro.id!, registro.numero_crt)}
                          disabled={deleteLoading}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDeleteModal && deleteModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Excluir CRT Completo</h3>
                <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-red-800 mb-2">
                Você está prestes a excluir TODOS os registros relacionados ao CRT:
              </p>
              <p className="text-lg font-bold text-red-900 mb-3">{deleteModalData.numero_crt}</p>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between items-center py-2 border-b border-red-200">
                  <span className="font-medium">Pré-cadastro:</span>
                  <span className="font-bold text-red-700">1 registro</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-red-200">
                  <span className="font-medium">Bobinas:</span>
                  <span className="font-bold text-red-700">{deleteModalData.bobinasCount} registro(s)</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Notas Fiscais:</span>
                  <span className="font-bold text-red-700">{deleteModalData.notasFiscaisCount} registro(s)</span>
                </div>
              </div>

              <p className="text-sm font-semibold text-red-800 mt-3">
                Total: {1 + deleteModalData.bobinasCount + deleteModalData.notasFiscaisCount} registro(s) serão excluídos permanentemente
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Justificativa para Exclusão *
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
                placeholder="Digite a justificativa para esta exclusão..."
                disabled={deleteLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                A justificativa é obrigatória e ficará registrada no sistema
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                disabled={deleteLoading || !justificativa.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                {deleteLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
              <button
                onClick={cancelDelete}
                disabled={deleteLoading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

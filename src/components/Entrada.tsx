import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Plus, Trash2, FileText, Edit2 } from 'lucide-react';

interface NotaFiscal {
  id: string;
  numero_nota_fiscal: string;
  valor_nota_fiscal: string;
}

interface Bobina {
  id: string;
  numero_bobina: string;
  numero_oc: string;
  numero_fatura: string;
  numero_ov: string;
  tipo_papel: string;
  gramatura: string;
  formato_mm: string;
  peso_kg: string;
  rua: string;
  quadra: string;
  linha: string;
  nota_fiscal_id: string;
}

interface BobinaTemplate {
  numero_oc: string;
  numero_fatura: string;
  numero_ov: string;
  tipo_papel: string;
  gramatura: string;
  formato_mm: string;
}

export default function Entrada() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingBobinaId, setEditingBobinaId] = useState<string | null>(null);

  const [crtData, setCrtData] = useState({
    numero_crt: '',
    ov: '',
    oc: '',
    exportador: '',
    importador: '',
    origem: '',
    data_emissao: '',
    data_entrada: '',
    data_descarga: '',
    placa_cavalo: '',
    placa_carreta: '',
    nome_motorista: '',
    volumes_programados_qtd: 0,
    volumes_programados_kg: 0,
  });

  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [bobinas, setBobinas] = useState<Bobina[]>([]);
  const [bobinaTemplate, setBobinaTemplate] = useState<BobinaTemplate | null>(null);

  useEffect(() => {
    if (bobinas.length > 0 && !bobinaTemplate) {
      const firstBobina = bobinas[0];
      if (firstBobina.tipo_papel && firstBobina.gramatura && firstBobina.formato_mm) {
        setBobinaTemplate({
          numero_oc: firstBobina.numero_oc,
          numero_fatura: firstBobina.numero_fatura,
          numero_ov: firstBobina.numero_ov,
          tipo_papel: firstBobina.tipo_papel,
          gramatura: firstBobina.gramatura,
          formato_mm: firstBobina.formato_mm,
        });
      }
    }
  }, [bobinas, bobinaTemplate]);

  const addNotaFiscal = () => {
    if (notasFiscais.length >= 50) {
      alert('Limite máximo de 50 notas fiscais atingido');
      return;
    }
    setNotasFiscais([...notasFiscais, {
      id: crypto.randomUUID(),
      numero_nota_fiscal: '',
      valor_nota_fiscal: '',
    }]);
  };

  const removeNotaFiscal = (id: string) => {
    setNotasFiscais(notasFiscais.filter(nf => nf.id !== id));
    setBobinas(bobinas.filter(b => b.nota_fiscal_id !== id));
  };

  const updateNotaFiscal = (id: string, field: keyof NotaFiscal, value: string) => {
    setNotasFiscais(notasFiscais.map(nf =>
      nf.id === id ? { ...nf, [field]: value } : nf
    ));
  };

  const addBobina = (notaFiscalId: string) => {
    if (bobinas.length >= 300) {
      alert('Limite máximo de 300 bobinas atingido');
      return;
    }
    setBobinas([...bobinas, {
      id: crypto.randomUUID(),
      numero_bobina: '',
      numero_oc: bobinaTemplate?.numero_oc || '',
      numero_fatura: bobinaTemplate?.numero_fatura || '',
      numero_ov: bobinaTemplate?.numero_ov || '',
      tipo_papel: bobinaTemplate?.tipo_papel || '',
      gramatura: bobinaTemplate?.gramatura || '',
      formato_mm: bobinaTemplate?.formato_mm || '',
      peso_kg: '',
      rua: '',
      quadra: '',
      linha: '',
      nota_fiscal_id: notaFiscalId,
    }]);
  };

  const removeBobina = (id: string) => {
    setBobinas(bobinas.filter(b => b.id !== id));
  };

  const updateBobina = (id: string, field: keyof Bobina, value: string) => {
    setBobinas(bobinas.map(b =>
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const startEditBobina = (id: string) => {
    setEditingBobinaId(id);
  };

  const saveEditBobina = () => {
    setEditingBobinaId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      if (!crtData.numero_crt.trim()) {
        alert('Número do CRT é obrigatório');
        setLoading(false);
        return;
      }

      const { data: existingBobinas } = await supabase
        .from('bobinas')
        .select('numero_bobina')
        .eq('numero_crt', crtData.numero_crt.trim())
        .limit(1);

      if (existingBobinas && existingBobinas.length > 0) {
        alert(`Erro: O CRT "${crtData.numero_crt}" já possui bobinas cadastradas no sistema. Use um número de CRT diferente ou verifique os dados já inseridos.`);
        setLoading(false);
        return;
      }

      if (notasFiscais.length === 0) {
        alert('Adicione pelo menos uma nota fiscal');
        setLoading(false);
        return;
      }

      if (bobinas.length === 0) {
        alert('Adicione pelo menos uma bobina');
        setLoading(false);
        return;
      }

      for (const nf of notasFiscais) {
        if (!nf.numero_nota_fiscal.trim()) {
          alert('Todas as notas fiscais devem ter um número');
          setLoading(false);
          return;
        }
      }

      for (const bobina of bobinas) {
        if (!bobina.numero_bobina.trim() || !bobina.tipo_papel || !bobina.gramatura ||
            !bobina.formato_mm || !bobina.peso_kg) {
          alert('Todas as bobinas devem ter número, tipo de papel, gramatura, formato e peso preenchidos');
          setLoading(false);
          return;
        }
      }

      const notasFiscaisInsert = notasFiscais.map(nf => ({
        numero_crt: crtData.numero_crt.trim(),
        numero_nota_fiscal: nf.numero_nota_fiscal.trim(),
        valor_nota_fiscal: nf.valor_nota_fiscal ? parseFloat(nf.valor_nota_fiscal) : null,
      }));

      const { data: notasFiscaisInseridas, error: nfError } = await supabase
        .from('notas_fiscais')
        .insert(notasFiscaisInsert)
        .select();

      if (nfError) throw nfError;
      if (!notasFiscaisInseridas || notasFiscaisInseridas.length === 0) {
        throw new Error('Erro ao inserir notas fiscais');
      }

      const idMapping = new Map<string, string>();
      notasFiscais.forEach((nf, index) => {
        idMapping.set(nf.id, notasFiscaisInseridas[index].id);
      });

      const bobinasInsert = bobinas.map(b => ({
        numero_bobina: b.numero_bobina.trim(),
        numero_crt: crtData.numero_crt.trim(),
        numero_oc: b.numero_oc?.trim() || null,
        numero_fatura: b.numero_fatura?.trim() || null,
        numero_ov: b.numero_ov?.trim() || null,
        tipo_papel: b.tipo_papel,
        gramatura: parseInt(b.gramatura),
        formato_mm: parseInt(b.formato_mm),
        peso_kg: parseFloat(b.peso_kg),
        exportador: crtData.exportador?.trim() || null,
        importador: crtData.importador?.trim() || null,
        origem: crtData.origem || null,
        status: 'em_estoque',
        data_emissao: crtData.data_emissao || null,
        data_entrada: crtData.data_entrada || null,
        data_descarga: crtData.data_descarga || null,
        placa_cavalo: crtData.placa_cavalo?.trim() || null,
        placa_carreta: crtData.placa_carreta?.trim() || null,
        nome_motorista: crtData.nome_motorista?.trim() || null,
        rua: b.rua?.trim() || null,
        quadra: b.quadra?.trim() || null,
        linha: b.linha?.trim() || null,
        nota_fiscal_id: idMapping.get(b.nota_fiscal_id) || null,
      }));

      const { error: bobinasError } = await supabase
        .from('bobinas')
        .insert(bobinasInsert);

      if (bobinasError) throw bobinasError;

      setSuccess(true);
      setCrtData({
        numero_crt: '',
        ov: '',
        oc: '',
        exportador: '',
        importador: '',
        origem: '',
        data_emissao: '',
        data_entrada: '',
        data_descarga: '',
        placa_cavalo: '',
        placa_carreta: '',
        nome_motorista: '',
        volumes_programados_qtd: 0,
        volumes_programados_kg: 0,
      });
      setNotasFiscais([]);
      setBobinas([]);
      setBobinaTemplate(null);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erro ao salvar entrada:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        alert(`Erro: Já existe um registro com este CRT "${crtData.numero_crt}" no sistema. Por favor, use um número diferente.`);
      } else {
        alert('Erro ao salvar entrada: ' + (error.message || 'Verifique os dados e tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCrtData = async (numeroCrt: string) => {
    if (!numeroCrt.trim()) {
      setBobinaTemplate(null);
      return;
    }

    try {
      const { data: preCadastro, error: preCadastroError } = await supabase
        .from('pre_cadastro')
        .select('*')
        .eq('numero_crt', numeroCrt.trim())
        .maybeSingle();

      if (preCadastroError) {
        console.error('Erro ao buscar pré-cadastro:', preCadastroError);
      }

      if (preCadastro) {
        setCrtData(prev => ({
          ...prev,
          ov: preCadastro.ov || '',
          oc: preCadastro.oc || '',
          exportador: preCadastro.exportador || '',
          importador: preCadastro.importador || '',
          origem: preCadastro.origem || '',
          data_emissao: preCadastro.data_emissao_crt || '',
          volumes_programados_qtd: preCadastro.volumes_programados_qtd || 0,
          volumes_programados_kg: preCadastro.volumes_programados_kg || 0,
        }));
      } else {
        const { data: bobinasExistentes, error } = await supabase
          .from('bobinas')
          .select('exportador, importador, origem, data_emissao, numero_oc, numero_fatura, numero_ov, tipo_papel, gramatura, formato_mm')
          .eq('numero_crt', numeroCrt.trim())
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar dados do CRT:', error);
          return;
        }

        if (bobinasExistentes) {
          setCrtData(prev => ({
            ...prev,
            exportador: bobinasExistentes.exportador || '',
            importador: bobinasExistentes.importador || '',
            origem: bobinasExistentes.origem || '',
            data_emissao: bobinasExistentes.data_emissao || '',
          }));

          setBobinaTemplate({
            numero_oc: bobinasExistentes.numero_oc || '',
            numero_fatura: bobinasExistentes.numero_fatura || '',
            numero_ov: bobinasExistentes.numero_ov || '',
            tipo_papel: bobinasExistentes.tipo_papel || '',
            gramatura: bobinasExistentes.gramatura?.toString() || '',
            formato_mm: bobinasExistentes.formato_mm?.toString() || '',
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do CRT:', error);
    }
  };

  const handleCrtChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setCrtData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'numero_crt') {
      loadCrtData(value);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Entrada de Bobinas</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Dados do CRT e Transporte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número CRT *
              </label>
              <input
                type="text"
                name="numero_crt"
                value={crtData.numero_crt}
                onChange={handleCrtChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o número do CRT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OV (Ordem de Venda)
              </label>
              <input
                type="text"
                name="ov"
                value={crtData.ov}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                placeholder="Carregado do pré-cadastro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OC (Ordem de Compra)
              </label>
              <input
                type="text"
                name="oc"
                value={crtData.oc}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                placeholder="Carregado do pré-cadastro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exportador
              </label>
              <input
                type="text"
                name="exportador"
                value={crtData.exportador}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                placeholder="Carregado do pré-cadastro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Importador
              </label>
              <input
                type="text"
                name="importador"
                value={crtData.importador}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                placeholder="Carregado do pré-cadastro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origem
              </label>
              <input
                type="text"
                name="origem"
                value={crtData.origem}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                placeholder="Carregado do pré-cadastro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Emissão do CRT
              </label>
              <input
                type="date"
                name="data_emissao"
                value={crtData.data_emissao}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vol. Programados (Qtd)
              </label>
              <input
                type="number"
                value={crtData.volumes_programados_qtd}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vol. Programados (Kg)
              </label>
              <input
                type="number"
                value={crtData.volumes_programados_kg}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Entrada (Pátio)
              </label>
              <input
                type="datetime-local"
                name="data_entrada"
                value={crtData.data_entrada}
                onChange={handleCrtChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Descarga
              </label>
              <input
                type="datetime-local"
                name="data_descarga"
                value={crtData.data_descarga}
                onChange={handleCrtChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa do Cavalo
              </label>
              <input
                type="text"
                name="placa_cavalo"
                value={crtData.placa_cavalo}
                onChange={handleCrtChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: ABC-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa da Carreta
              </label>
              <input
                type="text"
                name="placa_carreta"
                value={crtData.placa_carreta}
                onChange={handleCrtChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: DEF-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Motorista
              </label>
              <input
                type="text"
                name="nome_motorista"
                value={crtData.nome_motorista}
                onChange={handleCrtChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo"
              />
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-gray-800">
              Notas Fiscais ({notasFiscais.length}/50)
            </h3>
            <button
              type="button"
              onClick={addNotaFiscal}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Nota Fiscal
            </button>
          </div>

          <div className="space-y-3">
            {notasFiscais.map((nf) => (
              <div key={nf.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-green-600 mt-2" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número Nota Fiscal *
                      </label>
                      <input
                        type="text"
                        value={nf.numero_nota_fiscal}
                        onChange={(e) => updateNotaFiscal(nf.id, 'numero_nota_fiscal', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ex: 12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={nf.valor_nota_fiscal}
                        onChange={(e) => updateNotaFiscal(nf.id, 'valor_nota_fiscal', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNotaFiscal(nf.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 pl-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Bobinas desta NF ({bobinas.filter(b => b.nota_fiscal_id === nf.id).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => addBobina(nf.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Bobina
                    </button>
                  </div>

                  <div className="space-y-2">
                    {bobinas.filter(b => b.nota_fiscal_id === nf.id).map((bobina) => (
                      <div key={bobina.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nº Bobina *
                            </label>
                            <input
                              type="text"
                              value={bobina.numero_bobina}
                              onChange={(e) => updateBobina(bobina.id, 'numero_bobina', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Ex: 001"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Tipo Papel *
                            </label>
                            <select
                              value={bobina.tipo_papel}
                              onChange={(e) => updateBobina(bobina.id, 'tipo_papel', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Sel.</option>
                              <option value="Kraftliner">Kraftliner</option>
                              <option value="Eukaliner">Eukaliner</option>
                              <option value="Testliner">Testliner</option>
                              <option value="Fluting">Fluting</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Gram. *
                            </label>
                            <select
                              value={bobina.gramatura}
                              onChange={(e) => updateBobina(bobina.id, 'gramatura', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Sel.</option>
                              <option value="125">125</option>
                              <option value="140">140</option>
                              <option value="150">150</option>
                              <option value="170">170</option>
                              <option value="175">175</option>
                              <option value="180">180</option>
                              <option value="200">200</option>
                              <option value="240">240</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Formato *
                            </label>
                            <select
                              value={bobina.formato_mm}
                              onChange={(e) => updateBobina(bobina.id, 'formato_mm', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Sel.</option>
                              <option value="2100">2.100</option>
                              <option value="2370">2.370</option>
                              <option value="2450">2.450</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Peso (kg) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={bobina.peso_kg}
                              onChange={(e) => updateBobina(bobina.id, 'peso_kg', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Rua
                            </label>
                            <input
                              type="text"
                              value={bobina.rua}
                              onChange={(e) => updateBobina(bobina.id, 'rua', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Ex: A"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quadra
                            </label>
                            <input
                              type="text"
                              value={bobina.quadra}
                              onChange={(e) => updateBobina(bobina.id, 'quadra', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Ex: 1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Linha
                            </label>
                            <input
                              type="text"
                              value={bobina.linha}
                              onChange={(e) => updateBobina(bobina.id, 'linha', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Ex: 01"
                            />
                          </div>
                          <div className="flex items-end gap-1">
                            {editingBobinaId === bobina.id ? (
                              <button
                                type="button"
                                onClick={saveEditBobina}
                                className="flex-1 px-2 py-1 text-green-600 hover:bg-green-50 rounded text-xs border border-green-300 font-medium"
                              >
                                Salvar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditBobina(bobina.id)}
                                className="flex-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs border border-blue-300"
                              >
                                <Edit2 className="w-3 h-3 mx-auto" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeBobina(bobina.id)}
                              className="flex-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs border border-red-300"
                            >
                              <Trash2 className="w-3 h-3 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {notasFiscais.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Nenhuma nota fiscal adicionada. Clique em "Adicionar Nota Fiscal" para começar.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Salvando...' : 'Salvar Entrada Completa'}
          </button>

          {success && (
            <span className="text-green-600 font-medium">
              Entrada registrada com sucesso!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

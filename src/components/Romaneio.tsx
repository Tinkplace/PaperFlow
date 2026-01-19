import { useState, useEffect } from 'react';
import { supabase, Bobina } from '../lib/supabase';
import { FileDown, Truck, Package, FileText, X } from 'lucide-react';

interface Destino {
  destino: string;
  ordem: number;
}

interface RomaneioExistente {
  id: string;
  data_carregamento: string;
  nome_motorista: string;
  placa_carreta: string;
  destino: string;
  bobinas_count: number;
}

interface PedidoPendente {
  id: string;
  numero_crt: string;
  numero_oc: string;
  numero_ov: string;
  numero_fatura: string;
  quantidade_bobinas: number;
  peso_total_kg: number;
  destinos: string[];
  bobinas_pendentes: number;
  created_at: string;
}

interface RemitoData {
  remitente: string;
  destinatario: string;
  patente_camion: string;
  patente_semi: string;
  chofer: string;
  documento: string;
  documentos_carga: string;
  descripcion: string;
  cantidad: string;
  total_peso_bruto: string;
  total_peso_neto: string;
  total_bultos: string;
  fecha: string;
}

export default function Romaneio() {
  const [crts, setCrts] = useState<string[]>([]);
  const [selectedCrt, setSelectedCrt] = useState<string>('');
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [selectedDestino, setSelectedDestino] = useState<string>('');
  const [selectedCaminhaoIndex, setSelectedCaminhaoIndex] = useState<number>(0);
  const [bobinas, setBobinas] = useState<Bobina[]>([]);
  const [totalBobinasDisponiveis, setTotalBobinasDisponiveis] = useState<number>(0);
  const [totalBobinasOriginal, setTotalBobinasOriginal] = useState<number>(0);
  const [romaneiosExistentes, setRomaneiosExistentes] = useState<RomaneioExistente[]>([]);
  const [selectedBobinas, setSelectedBobinas] = useState<Set<string>>(new Set());
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoPendente[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRemitoModal, setShowRemitoModal] = useState(false);
  const [remitoData, setRemitoData] = useState<RemitoData>({
    remitente: 'Klabin S.A\nAV. Brigadeiro Faria Lima 3600\nItaim Bibi, São Paulo\nCNPJ 89.637.490/0001-45',
    destinatario: '',
    patente_camion: '',
    patente_semi: '',
    chofer: '',
    documento: '',
    documentos_carga: '',
    descripcion: '',
    cantidad: '',
    total_peso_bruto: '',
    total_peso_neto: '',
    total_bultos: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  const [formData, setFormData] = useState({
    data_carregamento: '',
    nome_motorista: '',
    placa_carreta: '',
    numero_crt: '',
    numero_fatura: '',
    destino: '',
  });

  useEffect(() => {
    loadCrts();
    loadPedidosPendentes();
  }, []);

  const loadCrts = async () => {
    const { data: pedidosGerados } = await supabase
      .from('pedidos')
      .select('numero_crt')
      .eq('cancelado', false)
      .not('numero_crt', 'is', null)
      .not('numero_fatura', 'is', null);

    if (pedidosGerados) {
      const crtsComPedido = pedidosGerados.map(p => p.numero_crt).filter(Boolean);

      const { data: bobinasData } = await supabase
        .from('bobinas')
        .select('numero_crt')
        .eq('status', 'em_estoque')
        .in('numero_crt', crtsComPedido)
        .order('numero_crt', { ascending: true });

      if (bobinasData) {
        const uniqueCrts = [...new Set(bobinasData.map(b => b.numero_crt).filter(Boolean))] as string[];
        setCrts(uniqueCrts);
      }
    }
  };

  const loadPedidosPendentes = async () => {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('id, numero_crt, numero_oc, numero_ov, numero_fatura, quantidade_bobinas, peso_total_kg, created_at')
        .eq('cancelado', false)
        .not('destino', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pedidosComDetalhes = await Promise.all(
        (pedidos || []).map(async (pedido) => {
          const { data: destinosData } = await supabase
            .from('pedidos_destinos')
            .select('destino')
            .eq('pedido_id', pedido.id)
            .order('ordem', { ascending: true });

          const { count: bobinasPendentes } = await supabase
            .from('bobinas')
            .select('*', { count: 'exact', head: true })
            .eq('numero_crt', pedido.numero_crt)
            .eq('status', 'em_estoque');

          return {
            ...pedido,
            destinos: destinosData?.map(d => d.destino) || [],
            bobinas_pendentes: bobinasPendentes || 0
          };
        })
      );

      const pedidosFiltrados = pedidosComDetalhes.filter(p => p.bobinas_pendentes > 0);
      setPedidosPendentes(pedidosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar pedidos pendentes:', error);
    }
  };

  const loadCrtDestinos = async (crt: string) => {
    setSelectedCrt(crt);
    setSelectedDestino('');
    setSelectedCaminhaoIndex(0);
    setBobinas([]);
    setSelectedBobinas(new Set());

    const { data: bobinasDisponiveis } = await supabase
      .from('bobinas')
      .select('id')
      .eq('numero_crt', crt)
      .eq('status', 'em_estoque');

    setTotalBobinasDisponiveis(bobinasDisponiveis?.length || 0);

    const { data: todasBobinas } = await supabase
      .from('bobinas')
      .select('id')
      .eq('numero_crt', crt);

    setTotalBobinasOriginal(todasBobinas?.length || 0);

    const { data: romaneiosData } = await supabase
      .from('romaneios')
      .select(`
        id,
        data_carregamento,
        nome_motorista,
        placa_carreta,
        destino
      `)
      .eq('numero_crt', crt)
      .order('data_carregamento', { ascending: false });

    if (romaneiosData) {
      const romaneiosComContagem = await Promise.all(
        romaneiosData.map(async (rom) => {
          const { count } = await supabase
            .from('romaneios_bobinas')
            .select('*', { count: 'exact', head: true })
            .eq('romaneio_id', rom.id);

          return {
            ...rom,
            bobinas_count: count || 0,
          };
        })
      );
      setRomaneiosExistentes(romaneiosComContagem);
    }

    const { data: pedidoData } = await supabase
      .from('pedidos')
      .select('id, numero_fatura')
      .eq('numero_crt', crt)
      .eq('cancelado', false)
      .maybeSingle();

    if (pedidoData) {
      const { data: destinosData } = await supabase
        .from('pedidos_destinos')
        .select('destino, ordem')
        .eq('pedido_id', pedidoData.id)
        .order('ordem', { ascending: true });

      if (destinosData) {
        setDestinos(destinosData);
      }

      setFormData(prev => ({
        ...prev,
        numero_crt: crt,
        numero_fatura: pedidoData.numero_fatura || '',
        destino: ''
      }));
    }
  };

  const loadDestinosBobinas = async (destino: string, caminhaoIndex: number) => {
    setSelectedDestino(destino);
    setSelectedCaminhaoIndex(caminhaoIndex);

    const { data: bobinasData } = await supabase
      .from('bobinas')
      .select('*')
      .eq('numero_crt', selectedCrt)
      .eq('status', 'em_estoque')
      .order('numero_bobina', { ascending: true });

    if (bobinasData) {
      setBobinas(bobinasData);
      setTotalBobinasDisponiveis(bobinasData.length);
      setSelectedBobinas(new Set());
      setFormData(prev => ({
        ...prev,
        destino: destino
      }));
    }
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

  const generateRomaneio = async () => {
    if (!formData.data_carregamento || !formData.nome_motorista ||
        !formData.placa_carreta || !formData.destino) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (selectedBobinas.size === 0) {
      alert('Selecione pelo menos uma bobina');
      return;
    }

    setLoading(true);
    try {
      const { data: romaneio, error: romaneioError } = await supabase
        .from('romaneios')
        .insert([{
          data_carregamento: formData.data_carregamento,
          nome_motorista: formData.nome_motorista,
          placa_carreta: formData.placa_carreta,
          numero_crt: formData.numero_crt || null,
          numero_fatura: formData.numero_fatura || null,
          destino: formData.destino,
          pedido_id: null,
        }])
        .select()
        .single();

      if (romaneioError) throw romaneioError;

      const romaneiosBobinas = Array.from(selectedBobinas).map(bobinaId => ({
        romaneio_id: romaneio.id,
        bobina_id: bobinaId,
      }));

      const { error: relError } = await supabase
        .from('romaneios_bobinas')
        .insert(romaneiosBobinas);

      if (relError) throw relError;

      const { error: updateError } = await supabase
        .from('bobinas')
        .update({ status: 'carregado' })
        .in('id', Array.from(selectedBobinas));

      if (updateError) throw updateError;

      const crtDoRomaneio = formData.numero_crt;
      let bobinasRestantesAposRomaneio = 0;

      if (crtDoRomaneio) {
        const { data: bobinasRestantes } = await supabase
          .from('bobinas')
          .select('id')
          .eq('numero_crt', crtDoRomaneio)
          .eq('status', 'em_estoque');

        bobinasRestantesAposRomaneio = bobinasRestantes?.length || 0;

        if (bobinasRestantesAposRomaneio === 0) {
          const { data: pedidoData } = await supabase
            .from('pedidos')
            .select('id')
            .eq('numero_crt', crtDoRomaneio)
            .eq('cancelado', false)
            .maybeSingle();

          if (pedidoData) {
            await supabase
              .from('pedidos')
              .update({ status_pedido: 'carregamento' })
              .eq('id', pedidoData.id);
          }
        }
      }

      if (bobinasRestantesAposRomaneio === 0) {
        alert('Romaneio gerado com sucesso!\n\n✅ CARGA COMPLETA - Todas as bobinas do CRT foram carregadas!');
      } else {
        alert(`Romaneio gerado com sucesso!\n\n📦 Saldo restante: ${bobinasRestantesAposRomaneio} bobinas\n\n💡 Você pode:\n- Selecionar outro destino (caminhão) para criar um novo romaneio\n- Carregar mais bobinas para o mesmo destino\n- Continuar até zerar o saldo de bobinas`);
      }

      generatePDF(romaneio, bobinas.filter(b => selectedBobinas.has(b.id)), selectedCaminhaoIndex + 1);

      if (bobinasRestantesAposRomaneio === 0) {
        setFormData({
          data_carregamento: '',
          nome_motorista: '',
          placa_carreta: '',
          numero_crt: '',
          numero_fatura: '',
          destino: '',
        });
        setSelectedBobinas(new Set());
        setBobinas([]);
        setSelectedDestino('');
        setSelectedCrt('');
        setSelectedCaminhaoIndex(0);
        setDestinos([]);
        setTotalBobinasDisponiveis(0);
        setTotalBobinasOriginal(0);
        setRomaneiosExistentes([]);
        loadCrts();
        loadPedidosPendentes();
      } else {
        setFormData(prev => ({
          data_carregamento: '',
          nome_motorista: '',
          placa_carreta: '',
          numero_crt: prev.numero_crt,
          numero_fatura: prev.numero_fatura,
          destino: '',
        }));
        setSelectedBobinas(new Set());
        setSelectedDestino('');
        loadCrtDestinos(crtDoRomaneio);
        loadPedidosPendentes();
      }
    } catch (error: any) {
      console.error('Erro ao gerar romaneio:', error);
      const errorMessage = error?.message || error?.error_description || 'Erro desconhecido';
      alert(`Erro ao gerar romaneio: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const openRemitoModal = async (romaneioId: string) => {
    try {
      // Buscar dados do romaneio
      const { data: romaneio, error: romaneioError } = await supabase
        .from('romaneios')
        .select('*')
        .eq('id', romaneioId)
        .single();

      if (romaneioError) throw romaneioError;

      // Buscar bobinas do romaneio
      const { data: romaneiosBobinas, error: rbError } = await supabase
        .from('romaneios_bobinas')
        .select('bobina_id')
        .eq('romaneio_id', romaneioId);

      if (rbError) throw rbError;

      const bobinaIds = romaneiosBobinas?.map(rb => rb.bobina_id) || [];

      const { data: bobinasData, error: bobinasError } = await supabase
        .from('bobinas')
        .select('*')
        .in('id', bobinaIds);

      if (bobinasError) throw bobinasError;

      // Buscar dados do pedido para obter o OC
      let numeroOc = '';
      if (romaneio.numero_crt) {
        const { data: pedidoData } = await supabase
          .from('pedidos')
          .select('numero_oc')
          .eq('numero_crt', romaneio.numero_crt)
          .eq('cancelado', false)
          .maybeSingle();

        numeroOc = pedidoData?.numero_oc || '';
      }

      // Calcular totais
      const totalPesoBruto = bobinasData?.reduce((sum, b) => sum + Number(b.peso_kg), 0) || 0;
      const totalBultos = bobinasData?.length || 0;

      // Extrair tipos de papel únicos
      const tiposPapel = [...new Set(bobinasData?.map(b => b.tipo_papel) || [])];
      const descripcion = `${totalPesoBruto.toFixed(2)} kg de ${tiposPapel.join(', ')}`;

      // Documentos de la carga
      const documentosCarga = `CRT: ${romaneio.numero_crt || 'N/A'}\nOC: ${numeroOc || 'N/A'}`;

      setRemitoData({
        remitente: 'Klabin S.A\nAV. Brigadeiro Faria Lima 3600\nItaim Bibi, São Paulo\nCNPJ 89.637.490/0001-45',
        destinatario: romaneio.destino || '',
        patente_camion: romaneio.placa_carreta || '',
        patente_semi: '',
        chofer: romaneio.nome_motorista || '',
        documento: '',
        documentos_carga: documentosCarga,
        descripcion: descripcion,
        cantidad: totalPesoBruto.toFixed(2),
        total_peso_bruto: totalPesoBruto.toFixed(2),
        total_peso_neto: totalPesoBruto.toFixed(2),
        total_bultos: totalBultos.toString(),
        fecha: new Date(romaneio.data_carregamento).toISOString().split('T')[0],
      });

      setShowRemitoModal(true);
    } catch (error) {
      console.error('Erro ao carregar dados do remito:', error);
      alert('Erro ao carregar dados do remito');
    }
  };

  const printRemito = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>REMITO</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .section {
              border: 1px solid #000;
              padding: 10px;
              margin-bottom: 10px;
            }
            .section-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 8px;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
            }
            .field {
              margin: 5px 0;
              font-size: 12px;
            }
            .field-label {
              font-weight: bold;
              display: inline-block;
              width: 150px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .field-value {
              white-space: pre-line;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background: #f0f0f0;
              font-weight: bold;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>REMITO</h1>
              <p style="margin: 5px 0;">DOCUMENTO NO VÁLIDO COMO FACTURA</p>
              <p style="margin: 5px 0;">FECHA: ${remitoData.fecha}</p>
            </div>

            <div class="grid">
              <div class="section">
                <div class="section-title">REMITENTE</div>
                <div class="field-value">${remitoData.remitente}</div>
              </div>

              <div class="section">
                <div class="section-title">DESTINATARIO</div>
                <div class="field-value">${remitoData.destinatario}</div>
              </div>
            </div>

            <div class="grid">
              <div class="section">
                <div class="field">
                  <span class="field-label">Patente camión:</span>
                  <span>${remitoData.patente_camion}</span>
                </div>
                <div class="field">
                  <span class="field-label">Patente semi:</span>
                  <span>${remitoData.patente_semi}</span>
                </div>
                <div class="field">
                  <span class="field-label">Chofer:</span>
                  <span>${remitoData.chofer}</span>
                </div>
                <div class="field">
                  <span class="field-label">Documento:</span>
                  <span>${remitoData.documento}</span>
                </div>
              </div>

              <div class="section">
                <div class="section-title">DOCUMENTOS DE LA CARGA</div>
                <div>Carta de Porte:</div>
                <div class="field-value">${remitoData.documentos_carga}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>DESCRIPCIÓN</th>
                  <th>CANTIDAD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${remitoData.descripcion}</td>
                  <td>${remitoData.cantidad} kg</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 20px; text-align: right;">
              <div class="field">
                <span class="field-label">TOTAL PESO BRUTO:</span>
                <span>${remitoData.total_peso_bruto} kg</span>
              </div>
              <div class="field">
                <span class="field-label">TOTAL PESO NETO:</span>
                <span>${remitoData.total_peso_neto} kg</span>
              </div>
              <div class="field">
                <span class="field-label">TOTAL BULTOS:</span>
                <span>${remitoData.total_bultos}</span>
              </div>
            </div>

            <div class="section" style="margin-top: 30px;">
              <p style="font-size: 10px; margin: 0;">
                LA MERCADERÍA VIAJA POR CUENTA Y ORDEN DEL REMITENTE / DESTINATARIO.
                SIENDO EL SEGURO RESPONSABILIDAD DE LOS MISMOS, EXIMIENDO AL
                TRANSPORTISTA POR DAÑOS QUE PUDIERAN PRODUCIRSE DURANTE LA CARGA,
                TRANSPORTE Y DESCARGA DE LA MERCADERÍA.
              </p>
            </div>

            <div style="margin-top: 40px;">
              <div class="grid">
                <div>
                  <p style="font-weight: bold; margin-bottom: 60px;">RECIBÍ CONFORME</p>
                  <div style="border-top: 1px solid #000; width: 200px;">
                    <p style="margin: 5px 0; font-size: 10px;">Fecha:</p>
                    <p style="margin: 5px 0; font-size: 10px;">Firma:</p>
                    <p style="margin: 5px 0; font-size: 10px;">Aclaración:</p>
                    <p style="margin: 5px 0; font-size: 10px;">Documento:</p>
                  </div>
                </div>
                <div>
                  <p style="font-weight: bold; margin-bottom: 5px;">OBSERVACIONES</p>
                  <div style="border: 1px solid #000; height: 120px; padding: 5px;"></div>
                </div>
              </div>
            </div>
          </div>

          <button onclick="window.print()" style="
            margin-top: 20px;
            padding: 12px 24px;
            background: #333;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">
            Imprimir / Salvar PDF
          </button>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const generatePDF = (romaneio: any, bobinasCarregadas: Bobina[], caminhaoNumero: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalPeso = bobinasCarregadas.reduce((sum, b) => sum + Number(b.peso_kg), 0);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Romaneio ${romaneio.id} - Caminhão ${String(caminhaoNumero).padStart(2, '0')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .info-item {
              padding: 10px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .info-label {
              font-weight: bold;
              font-size: 12px;
              color: #666;
            }
            .info-value {
              font-size: 14px;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #333;
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 12px;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
              font-size: 12px;
            }
            tr:hover { background: #f9f9f9; }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 4px;
              font-size: 14px;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .summary-label {
              font-weight: bold;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ROMANEIO DE CARREGAMENTO</h1>
            <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #0066cc;">Caminhão ${String(caminhaoNumero).padStart(2, '0')}</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Data/Hora Carregamento</div>
              <div class="info-value">${new Date(romaneio.data_carregamento).toLocaleString('pt-BR')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Motorista</div>
              <div class="info-value">${romaneio.nome_motorista}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Placa Carreta</div>
              <div class="info-value">${romaneio.placa_carreta}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Destino</div>
              <div class="info-value">${romaneio.destino}</div>
            </div>
            ${romaneio.numero_crt ? `
            <div class="info-item">
              <div class="info-label">Número CRT</div>
              <div class="info-value">${romaneio.numero_crt}</div>
            </div>
            ` : ''}
            ${romaneio.numero_fatura ? `
            <div class="info-item">
              <div class="info-label">Número Fatura</div>
              <div class="info-value">${romaneio.numero_fatura}</div>
            </div>
            ` : ''}
          </div>

          <h2 style="margin-top: 30px; margin-bottom: 10px;">Bobinas Carregadas</h2>
          <table>
            <thead>
              <tr>
                <th>Nº Bobina</th>
                <th>OV</th>
                <th>Tipo</th>
                <th>Gramatura</th>
                <th>Formato (mm)</th>
                <th>Peso (kg)</th>
              </tr>
            </thead>
            <tbody>
              ${bobinasCarregadas.map(bobina => `
                <tr>
                  <td>${bobina.numero_bobina}</td>
                  <td>${bobina.numero_ov || '-'}</td>
                  <td>${bobina.tipo_papel}</td>
                  <td>${bobina.gramatura}</td>
                  <td>${bobina.formato_mm}</td>
                  <td>${Number(bobina.peso_kg).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total de Bobinas:</span>
              <span>${bobinasCarregadas.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Peso Total:</span>
              <span>${totalPeso.toFixed(2)} kg</span>
            </div>
          </div>

          <button onclick="window.print()" style="
            margin-top: 30px;
            padding: 12px 24px;
            background: #333;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">
            Imprimir / Salvar PDF
          </button>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Gerar Romaneio</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Selecione o CRT (Pedidos Gerados) *
              </label>
              <select
                value={selectedCrt}
                onChange={(e) => loadCrtDestinos(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um CRT</option>
                {crts.map((crt) => (
                  <option key={crt} value={crt}>
                    CRT: {crt}
                  </option>
                ))}
              </select>
            </div>

            {destinos.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    2. Selecione o Caminhão/Destino *
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      ({totalBobinasDisponiveis} bobinas disponíveis)
                    </span>
                  </label>
                  <select
                    value={selectedDestino}
                    onChange={(e) => {
                      const selectedIndex = destinos.findIndex(d => d.destino === e.target.value);
                      loadDestinosBobinas(e.target.value, selectedIndex);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um caminhão/destino</option>
                    {destinos.map((dest, index) => (
                      <option key={dest.ordem} value={dest.destino}>
                        Caminhão {String(index + 1).padStart(2, '0')} - {dest.destino}
                      </option>
                    ))}
                  </select>
                </div>
                {destinos.length > 1 && (
                  <div className="col-span-full">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      <p className="text-xs text-amber-800">
                        <strong>📌 Importante:</strong> Este CRT possui {destinos.length} destinos diferentes. Você pode criar um romaneio separado para cada destino, selecionando as bobinas específicas de cada carregamento. Após gerar um romaneio, selecione outro destino para continuar.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedCrt && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                      Saldo de Bobinas do CRT
                    </h3>
                    <p className="text-sm text-blue-700">
                      <span className="font-bold text-lg">{totalBobinasDisponiveis}</span> de <span className="font-bold text-lg">{totalBobinasOriginal}</span> bobinas disponíveis para carregamento
                    </p>
                    {totalBobinasDisponiveis === 0 ? (
                      <p className="text-xs text-green-700 mt-2 font-medium">
                        ✅ Carga completa - Todas as bobinas foram carregadas!
                      </p>
                    ) : (
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Você pode criar múltiplos romaneios para diferentes destinos até zerar o saldo de bobinas
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {romaneiosExistentes.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900">
                        Romaneios Criados ({romaneiosExistentes.length})
                      </h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Data/Hora
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Motorista
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Placa
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Destino
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Bobinas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {romaneiosExistentes.map((rom) => (
                          <tr key={rom.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(rom.data_carregamento).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {rom.nome_motorista}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {rom.placa_carreta}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {rom.destino}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {rom.bobinas_count}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => openRemitoModal(rom.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <FileText className="w-4 h-4" />
                                Gerar Remito
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data/Hora Carregamento *
              </label>
              <input
                type="datetime-local"
                value={formData.data_carregamento}
                onChange={(e) => setFormData({ ...formData, data_carregamento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Motorista *
              </label>
              <input
                type="text"
                value={formData.nome_motorista}
                onChange={(e) => setFormData({ ...formData, nome_motorista: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa da Carreta *
              </label>
              <input
                type="text"
                value={formData.placa_carreta}
                onChange={(e) => setFormData({ ...formData, placa_carreta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número CRT (Automático)
              </label>
              <input
                type="text"
                value={formData.numero_crt}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número da Fatura (Automático)
              </label>
              <input
                type="text"
                value={formData.numero_fatura}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destino (Automático)
              </label>
              <input
                type="text"
                value={formData.destino}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          {bobinas.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">
                  Selecione as Bobinas para Carregamento
                </h3>
              </div>
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
                        OV
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
                          {bobina.numero_ov || '-'}
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
          )}

          <button
            onClick={generateRomaneio}
            disabled={loading || selectedBobinas.size === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            {loading ? 'Gerando...' : `Gerar Romaneio (${selectedBobinas.size} bobinas)`}
          </button>
        </div>
      </div>

      {pedidosPendentes.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pedidos Pendentes de Romaneio</h2>
            <p className="text-sm text-gray-500 mt-1">Pedidos com bobinas aguardando carregamento</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {pedidosPendentes.map((pedido) => (
                <div
                  key={pedido.id}
                  className="border border-orange-300 bg-orange-50 hover:border-orange-400 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                          <Truck className="w-5 h-5 text-orange-600" />
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

                      <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Bobinas</p>
                          <p className="text-xl font-bold text-gray-900">{pedido.quantidade_bobinas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Pendentes</p>
                          <p className="text-xl font-bold text-orange-600">{pedido.bobinas_pendentes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Peso Total</p>
                          <p className="text-xl font-bold text-gray-900">{pedido.peso_total_kg.toFixed(2)} kg</p>
                        </div>
                      </div>

                      {pedido.destinos && pedido.destinos.length > 0 && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Destinos</p>
                          <div className="flex flex-wrap gap-2">
                            {pedido.destinos.map((destino, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                              >
                                {destino}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRemitoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Gerar Remito</h2>
              <button
                onClick={() => setShowRemitoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    REMITENTE
                  </label>
                  <textarea
                    value={remitoData.remitente}
                    onChange={(e) => setRemitoData({ ...remitoData, remitente: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DESTINATARIO
                  </label>
                  <textarea
                    value={remitoData.destinatario}
                    onChange={(e) => setRemitoData({ ...remitoData, destinatario: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patente camión
                  </label>
                  <input
                    type="text"
                    value={remitoData.patente_camion}
                    onChange={(e) => setRemitoData({ ...remitoData, patente_camion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patente semi
                  </label>
                  <input
                    type="text"
                    value={remitoData.patente_semi}
                    onChange={(e) => setRemitoData({ ...remitoData, patente_semi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chofer
                  </label>
                  <input
                    type="text"
                    value={remitoData.chofer}
                    onChange={(e) => setRemitoData({ ...remitoData, chofer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documento
                  </label>
                  <input
                    type="text"
                    value={remitoData.documento}
                    onChange={(e) => setRemitoData({ ...remitoData, documento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DOCUMENTOS DE LA CARGA (Carta de Porte)
                </label>
                <textarea
                  value={remitoData.documentos_carga}
                  onChange={(e) => setRemitoData({ ...remitoData, documentos_carga: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DESCRIPCIÓN
                  </label>
                  <input
                    type="text"
                    value={remitoData.descripcion}
                    onChange={(e) => setRemitoData({ ...remitoData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CANTIDAD (kg)
                  </label>
                  <input
                    type="text"
                    value={remitoData.cantidad}
                    onChange={(e) => setRemitoData({ ...remitoData, cantidad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TOTAL PESO BRUTO (kg)
                  </label>
                  <input
                    type="text"
                    value={remitoData.total_peso_bruto}
                    onChange={(e) => setRemitoData({ ...remitoData, total_peso_bruto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TOTAL PESO NETO (kg)
                  </label>
                  <input
                    type="text"
                    value={remitoData.total_peso_neto}
                    onChange={(e) => setRemitoData({ ...remitoData, total_peso_neto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TOTAL BULTOS
                  </label>
                  <input
                    type="text"
                    value={remitoData.total_bultos}
                    onChange={(e) => setRemitoData({ ...remitoData, total_bultos: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FECHA
                </label>
                <input
                  type="date"
                  value={remitoData.fecha}
                  onChange={(e) => setRemitoData({ ...remitoData, fecha: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowRemitoModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={printRemito}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FileDown className="w-4 h-4" />
                Imprimir Remito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Bobina {
  id: string;
  numero_bobina: string;
  numero_crt?: string;
  numero_oc?: string;
  numero_fatura?: string;
  numero_ov?: string;
  tipo_papel: string;
  gramatura: number;
  formato_mm: number;
  peso_kg: number;
  exportador?: string;
  importador?: string;
  numero_nota_fiscal?: string;
  valor_nota_fiscal?: number;
  origem?: string;
  status: 'em_transito' | 'em_estoque' | 'carregado';
  data_entrada?: string;
  data_descarga?: string;
  placa_cavalo?: string;
  placa_carreta?: string;
  nome_motorista?: string;
  created_at: string;
}

export interface Pedido {
  id: string;
  numero_ov: string;
  numero_fatura?: string;
  numero_crt?: string;
  numero_oc?: string;
  tipo_papel?: string;
  gramatura?: number;
  formato_mm?: number;
  quantidade_bobinas?: number;
  peso_total_kg?: number;
  destino?: string;
  prioridade?: number;
  data_pedido: string;
  status: 'pendente' | 'processando' | 'concluido';
  status_pedido?: 'recebido' | 'aguardando_dip' | 'separacao' | 'carregamento' | 'aduana_br' | 'aduana_ar' | 'rota' | 'entregue';
  dip_processado?: boolean;
  carga_completa?: boolean;
  created_at: string;
}

export interface Romaneio {
  id: string;
  numero_romaneio: string;
  data_carregamento: string;
  nome_motorista: string;
  placa_carreta: string;
  numero_crt?: string;
  numero_fatura?: string;
  destino: string;
  pedido_id?: string;
  created_at: string;
}

export interface CrtVolumeProgramado {
  id: string;
  numero_crt: string;
  bobinas_programadas: number;
  peso_programado_kg: number;
  created_at: string;
  updated_at: string;
}

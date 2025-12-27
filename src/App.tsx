import { useState } from 'react';
import { Package, FileText, Truck, BarChart3, MapPin, CheckSquare, LogOut, ClipboardList, Archive } from 'lucide-react';
import Entrada from './components/Entrada';
import Estoque from './components/Estoque';
import Saida from './components/Saida';
import Pedidos from './components/Pedidos';
import AcompanhamentoPedidos from './components/AcompanhamentoPedidos';
import ControleDips from './components/ControleDips';
import Romaneio from './components/Romaneio';
import Relatorios from './components/Relatorios';
import PreCadastro from './components/PreCadastro';

type Tab = 'entrada' | 'estoque' | 'saida' | 'pedidos' | 'acompanhamento' | 'controle-dips' | 'romaneio' | 'relatorios' | 'pre-cadastro';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('entrada');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-[#1A2441] border-r border-[#1A2441] shadow">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">BBM PaperFlow</h1>
          <p className="text-xs text-gray-300 mt-1">Gerenciamento de Bobinas</p>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('pre-cadastro')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pre-cadastro'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Pré Cadastro</span>
          </button>
          <button
            onClick={() => setActiveTab('entrada')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'entrada'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Entrada</span>
          </button>
          <button
            onClick={() => setActiveTab('estoque')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'estoque'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <Archive className="w-5 h-5" />
            <span>Estoque</span>
          </button>
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pedidos'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Pedidos</span>
          </button>
          <button
            onClick={() => setActiveTab('controle-dips')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'controle-dips'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>Controle de DIPs</span>
          </button>
          <button
            onClick={() => setActiveTab('romaneio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'romaneio'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span>Romaneio</span>
          </button>
          <button
            onClick={() => setActiveTab('saida')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'saida'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <LogOut className="w-5 h-5" />
            <span>Saída</span>
          </button>
          <button
            onClick={() => setActiveTab('acompanhamento')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'acompanhamento'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Status dos Pedidos</span>
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'relatorios'
                ? 'bg-white bg-opacity-10 text-white border border-white border-opacity-20'
                : 'text-gray-300 hover:bg-white hover:bg-opacity-5 border border-transparent'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Relatórios</span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeTab === 'entrada' && 'Entrada de Bobinas'}
              {activeTab === 'estoque' && 'Gestão de Estoque'}
              {activeTab === 'pre-cadastro' && 'Pré Cadastro de CRT'}
              {activeTab === 'saida' && 'Registro de Saída'}
              {activeTab === 'pedidos' && 'Gerenciar Pedidos'}
              {activeTab === 'acompanhamento' && 'Status dos Pedidos'}
              {activeTab === 'controle-dips' && 'Controle de DIPs'}
              {activeTab === 'romaneio' && 'Romaneios'}
              {activeTab === 'relatorios' && 'Relatórios e Análise'}
            </h2>
          </div>
        </header>

        <main className="flex-1 px-8 py-8 overflow-auto">
          {activeTab === 'entrada' && <Entrada />}
          {activeTab === 'estoque' && <Estoque />}
          {activeTab === 'pre-cadastro' && <PreCadastro />}
          {activeTab === 'saida' && <Saida />}
          {activeTab === 'pedidos' && <Pedidos />}
          {activeTab === 'acompanhamento' && <AcompanhamentoPedidos />}
          {activeTab === 'controle-dips' && <ControleDips />}
          {activeTab === 'romaneio' && <Romaneio />}
          {activeTab === 'relatorios' && <Relatorios />}
        </main>
      </div>
    </div>
  );
}

export default App;

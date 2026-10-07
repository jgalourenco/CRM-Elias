import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

// Auth Pages
import Login from '@/pages/auth/Login'
import Cadastro from '@/pages/auth/Cadastro'
import EsqueciSenha from '@/pages/auth/EsqueciSenha'
import RedefinirSenha from '@/pages/auth/RedefinirSenha'
import VerificarEmail from '@/pages/auth/VerificarEmail'

// App Pages
import Dashboard from '@/pages/Dashboard'
import PacientesList from '@/pages/pacientes/PacientesList'
import FichaPaciente from '@/pages/pacientes/FichaPaciente'
import Agendas from '@/pages/agendas/Agendas'
import FunilKanban from '@/pages/vendas/FunilKanban'
import ProspeccaoList from '@/pages/vendas/ProspeccaoList'
import Indicadores from '@/pages/vendas/Indicadores'
import ReguaAtendimento from '@/pages/automacao/ReguaAtendimento'
import WhatsAppSimulada from '@/pages/automacao/WhatsAppSimulada'
import EmailSimulada from '@/pages/automacao/EmailSimulada'
import PacotesConfig from '@/pages/config/PacotesConfig'
import ImportacaoMedX from '@/pages/config/ImportacaoMedX'
import EquipeConfig from '@/pages/config/EquipeConfig'
import MinhaConta from '@/pages/config/MinhaConta'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />

          {/* Authenticated Global Layout Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Pacientes */}
            <Route path="/pacientes" element={<PacientesList />} />
            <Route path="/pacientes/:id" element={<FichaPaciente />} />

            {/* Agendas */}
            <Route path="/agendas" element={<Agendas />} />

            {/* Vendas */}
            <Route path="/funil" element={<FunilKanban />} />
            <Route path="/prospeccao" element={<ProspeccaoList />} />
            <Route path="/indicadores" element={<Indicadores />} />

            {/* Automação */}
            <Route path="/automacao/regua" element={<ReguaAtendimento />} />
            <Route path="/automacao/whatsapp" element={<WhatsAppSimulada />} />
            <Route path="/automacao/email" element={<EmailSimulada />} />

            {/* Configurações */}
            <Route path="/config/pacotes" element={<PacotesConfig />} />
            <Route path="/config/importacao-medx" element={<ImportacaoMedX />} />
            <Route path="/config/equipe" element={<EquipeConfig />} />
            <Route path="/config/conta" element={<MinhaConta />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

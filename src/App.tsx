import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import { RoleRoute } from '@/components/auth/RoleRoute'

// Auth Pages
import Login from '@/pages/auth/Login'
import Cadastro from '@/pages/auth/Cadastro'
import EsqueciSenha from '@/pages/auth/EsqueciSenha'
import RedefinirSenha from '@/pages/auth/RedefinirSenha'
import VerificarEmail from '@/pages/auth/VerificarEmail'
import PrimeiroAcesso from '@/pages/auth/PrimeiroAcesso'

// App Pages
import Dashboard from '@/pages/Dashboard'
import PacientesList from '@/pages/pacientes/PacientesList'
import FichaPaciente from '@/pages/pacientes/FichaPaciente'
import PreCadastroPublico from '@/pages/pacientes/PreCadastroPublico'
import PortalPaciente from '@/pages/pacientes/PortalPaciente'
import Agendas from '@/pages/agendas/Agendas'
import RelatorioAgenda from '@/pages/agendas/RelatorioAgenda'
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
import Faturamento from '@/pages/financeiro/Faturamento'
import Lancamentos from '@/pages/financeiro/Lancamentos'
import Estoque from '@/pages/financeiro/Estoque'
import Sessoes from '@/pages/financeiro/Sessoes'
import RelatoriosFinanceiros from '@/pages/financeiro/Relatorios'
import DashboardGestao from '@/pages/gestao/DashboardGestao'
import PesquisaQualidade from '@/pages/marketing/PesquisaQualidade'
import ConfiguracoesHub from '@/pages/config/ConfiguracoesHub'
import CadastroGenerico from '@/pages/config/cadastros/CadastroGenerico'
import ParametrosGerais from '@/pages/config/ParametrosGerais'
import CoresAgenda from '@/pages/config/CoresAgenda'
import FormulariosAnamnese from '@/pages/config/FormulariosAnamnese'
import QuestionariosApoio from '@/pages/config/QuestionariosApoio'
import Auditoria from '@/pages/config/Auditoria'
import Integracoes from '@/pages/config/Integracoes'
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
          <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />

          {/* Public Patient Questionnaire */}
          <Route path="/questionario" element={<PreCadastroPublico />} />
          <Route path="/pre-cadastro" element={<PreCadastroPublico />} />

          {/* Esboço do Portal do Paciente (Perfil Visitante / Visão do Paciente) */}
          <Route path="/portal-paciente" element={<PortalPaciente />} />

          {/* Authenticated Global Layout Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Pacientes */}
            <Route path="/pacientes" element={<PacientesList />} />
            <Route path="/pacientes/:id" element={<FichaPaciente />} />

            {/* Agendas */}
            <Route path="/agendas" element={<Agendas />} />
            <Route path="/agendas/relatorio" element={<RelatorioAgenda />} />

            {/* Vendas */}
            <Route
              path="/funil"
              element={
                <RoleRoute permission={(p) => p.canAccessFunil}>
                  <FunilKanban />
                </RoleRoute>
              }
            />
            <Route
              path="/prospeccao"
              element={
                <RoleRoute permission={(p) => p.canAccessProspeccao}>
                  <ProspeccaoList />
                </RoleRoute>
              }
            />
            <Route
              path="/indicadores"
              element={
                <RoleRoute permission={(p) => p.canAccessIndicadores}>
                  <Indicadores />
                </RoleRoute>
              }
            />

            {/* Automação */}
            <Route
              path="/automacao/regua"
              element={
                <RoleRoute permission={(p) => p.canAccessRegua}>
                  <ReguaAtendimento />
                </RoleRoute>
              }
            />
            <Route
              path="/automacao/whatsapp"
              element={
                <RoleRoute permission={(p) => p.canAccessMensagens}>
                  <WhatsAppSimulada />
                </RoleRoute>
              }
            />
            <Route
              path="/automacao/email"
              element={
                <RoleRoute permission={(p) => p.canAccessMensagens}>
                  <EmailSimulada />
                </RoleRoute>
              }
            />

            {/* Financeiro */}
            <Route
              path="/financeiro/faturamento"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <Faturamento />
                </RoleRoute>
              }
            />
            <Route
              path="/financeiro/lancamentos"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <Lancamentos />
                </RoleRoute>
              }
            />
            <Route
              path="/financeiro/estoque"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <Estoque />
                </RoleRoute>
              }
            />
            <Route
              path="/financeiro/sessoes"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <Sessoes />
                </RoleRoute>
              }
            />
            <Route
              path="/financeiro/relatorios"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <RelatoriosFinanceiros />
                </RoleRoute>
              }
            />

            {/* Gestão e marketing */}
            <Route
              path="/gestao"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <DashboardGestao />
                </RoleRoute>
              }
            />
            <Route
              path="/marketing/qualidade"
              element={
                <RoleRoute permission={(p) => p.canAccessFinanceiro}>
                  <PesquisaQualidade />
                </RoleRoute>
              }
            />

            {/* Configurações clínicas e de gestão */}
            <Route
              path="/config"
              element={
                <RoleRoute permission={(p) => p.canAccessConfigClinica}>
                  <ConfiguracoesHub />
                </RoleRoute>
              }
            />
            <Route
              path="/config/cadastros/:slug"
              element={
                <RoleRoute permission={(p) => p.canAccessConfigClinica}>
                  <CadastroGenerico />
                </RoleRoute>
              }
            />
            <Route
              path="/config/parametros"
              element={
                <RoleRoute permission={(p) => p.canAccessConfigClinica}>
                  <ParametrosGerais />
                </RoleRoute>
              }
            />
            <Route
              path="/config/cores-agenda"
              element={
                <RoleRoute permission={(p) => p.canAccessConfigClinica}>
                  <CoresAgenda />
                </RoleRoute>
              }
            />
            <Route
              path="/config/formularios-anamnese"
              element={
                <RoleRoute permission={(p) => p.canAccessConfigClinica}>
                  <FormulariosAnamnese />
                </RoleRoute>
              }
            />
            <Route
              path="/config/questionarios-apoio"
              element={
                <RoleRoute permission={(p) => p.canAccessConfigClinica}>
                  <QuestionariosApoio />
                </RoleRoute>
              }
            />
            <Route
              path="/config/auditoria"
              element={
                <RoleRoute permission={(p) => p.canManageUsers}>
                  <Auditoria />
                </RoleRoute>
              }
            />
            <Route
              path="/config/integracoes"
              element={
                <RoleRoute permission={(p) => p.canManageUsers}>
                  <Integracoes />
                </RoleRoute>
              }
            />

            {/* Configurações */}
            <Route
              path="/config/pacotes"
              element={
                <RoleRoute permission={(p) => p.canAccessPacotesConfig}>
                  <PacotesConfig />
                </RoleRoute>
              }
            />
            <Route
              path="/config/importacao-medx"
              element={
                <RoleRoute permission={(p) => p.canAccessImportacoes}>
                  <ImportacaoMedX />
                </RoleRoute>
              }
            />
            <Route
              path="/config/equipe"
              element={
                <RoleRoute permission={(p) => p.canAccessEquipe}>
                  <EquipeConfig />
                </RoleRoute>
              }
            />
            <Route path="/config/conta" element={<MinhaConta />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

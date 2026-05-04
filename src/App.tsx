import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewAsProvider } from "@/contexts/ViewAsContext";
import { ViewAsBanner } from "@/components/layout/ViewAsSwitcher";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import Painel from "./pages/Painel";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import Sell from "./pages/Sell";
import Vender from "./pages/Vender";
import ListingDetail from "./pages/ListingDetail";
import MyListings from "./pages/MyListings";
import ListingCockpit from "./pages/ListingCockpit";
import MyProfile from "./pages/MyProfile";
import MyValuations from "./pages/MyValuations";
import Valuation from "./pages/Valuation";
import ValuationMultiplos from "./pages/ValuationMultiplos";
import ValuationDCF from "./pages/ValuationDCF";
import ValuationCertifier from "./pages/ValuationCertifier";
import Investors from "./pages/Investors";
import Capital from "./pages/Capital";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import PaymentSuccess from "./pages/PaymentSuccess";
import MapView from "./pages/MapView";
import NotFound from "./pages/NotFound";
import Matching from "./pages/Matching";
import MatchingResults from "./pages/MatchingResults";
import EditListing from "./pages/EditListing";
import BlindTeaser from "./pages/BlindTeaser";
import RegisterBuyer from "./pages/RegisterBuyer";
import MyCapitalRequests from "./pages/MyCapitalRequests";
import CapitalRequestDetail from "./pages/CapitalRequestDetail";
import MariCalculator from "./pages/MariCalculator";
import AwaitingApproval from "./pages/AwaitingApproval";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdvisorWhatsAppSetup from "./pages/admin/AdvisorWhatsAppSetup";
import AdminWhatsAppMonitor from "./pages/admin/AdminWhatsAppMonitor";
import AdminListings from "./pages/admin/AdminListings";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminValuations from "./pages/admin/AdminValuations";
import AdminPartnerships from "./pages/admin/AdminPartnerships";
import AdminCapital from "./pages/admin/AdminCapital";
import AdminCapitalProviders from "./pages/admin/AdminCapitalProviders";
import AdminCRM from "./pages/admin/AdminCRM";
import MondayImport from "./pages/admin/MondayImport";
import MondayParity from "./pages/admin/MondayParity";
import AdvisorsMapping from "./pages/admin/AdvisorsMapping";
import AdminApiMonitor from "./pages/admin/AdminApiMonitor";
import AdminApprovals from "./pages/admin/AdminApprovals";
import MatchingBuyers from "./pages/MatchingBuyers";
import CapitalCase from "./pages/CapitalCase";
import CapitalBySegment from "./pages/CapitalBySegment";
import CapitalByCity from "./pages/CapitalByCity";
import PortfolioPotential from "./pages/PortfolioPotential";
import PartnerDashboard from "./pages/PartnerDashboard";

// Equity Brain (cockpit interno)
import { RequireRole } from "@/components/auth/RequireRole";
import { EquityBrainLayout } from "@/components/equity-brain/EquityBrainLayout";
import EBDashboardPage from "./pages/equity-brain/DashboardPage";
import EBOportunidadesPage from "./pages/equity-brain/OportunidadesPage";
import EBBuyersPage from "./pages/equity-brain/BuyersPage";
import EBTesesPage from "./pages/equity-brain/TesesPage";
import EBCallsPage from "./pages/equity-brain/CallsPage";
import EBDealDetailPage from "./pages/equity-brain/DealDetailPage";
import EBMapaPage from "./pages/equity-brain/MapaPage";
import EBGrafoPage from "./pages/equity-brain/GrafoPage";
// Lazy: 3D graph carrega three/react-force-graph-3d só quando a rota é aberta.
const EBGrafoJarvisPage = lazy(() => import("./pages/equity-brain/GrafoJarvisPage"));
const EBGrafoJarvisGuiaPage = lazy(() => import("./pages/equity-brain/GrafoJarvisGuiaPage"));
import EBBoardPage from "./pages/equity-brain/BoardPage";
import EBShadowPage from "./pages/equity-brain/ShadowPage";
import CrmHubPage from "./pages/equity-brain/CrmHubPage";
import PermissionsAdminPage from "./pages/equity-brain/PermissionsAdminPage";
import MandateDetailPage from "./pages/equity-brain/MandateDetailPage";
import BuyerDetailPage from "./pages/equity-brain/BuyerDetailPage";
import AccessAuditPage from "./pages/equity-brain/AccessAuditPage";
import CrmAuditPage from "./pages/equity-brain/CrmAuditPage";
import MyCompaniesPage from "./pages/equity-brain/MyCompaniesPage";
import CrmAssignmentsPage from "./pages/equity-brain/CrmAssignmentsPage";
import HealthDashboardPage from "./pages/equity-brain/HealthDashboardPage";
import TodayPage from "./pages/equity-brain/TodayPage";
import NewsPage from "./pages/equity-brain/NewsPage";
import ExecutiveDashboardPage from "./pages/equity-brain/ExecutiveDashboardPage";
import MatchAnalyticsPage from "./pages/equity-brain/MatchAnalyticsPage";
import MatchInboxPage from "./pages/equity-brain/MatchInboxPage";
import MatchDetailPage from "./pages/equity-brain/MatchDetailPage";
import PipelineKanbanPage from "./pages/equity-brain/PipelineKanbanPage";
import PipelineHistoryPage from "./pages/equity-brain/PipelineHistoryPage";
import MandateFormPage from "./pages/equity-brain/MandateFormPage";
import ExportsPage from "./pages/equity-brain/ExportsPage";
import ImportsPage from "./pages/equity-brain/ImportsPage";
import IspImportPage from "./pages/equity-brain/IspImportPage";
import IspSuggestionsPage from "./pages/equity-brain/IspSuggestionsPage";
import IspMarketPage from "./pages/equity-brain/IspMarketPage";
import DisclosuresPage from "./pages/equity-brain/DisclosuresPage";
import UnifiedDealPage from "./pages/equity-brain/UnifiedDealPage";
import DashboardExecutivoPage from "./pages/dashboards/DashboardExecutivoPage";
import DashboardMandatoPage from "./pages/dashboards/DashboardMandatoPage";
import DashboardMatchPage from "./pages/dashboards/DashboardMatchPage";
import DashboardNboPage from "./pages/dashboards/DashboardNboPage";
import QuickFillPage from "./pages/equity-brain/QuickFillPage";
import PipelinePage from "./pages/equity-brain/PipelinePage";
import CompradoresPage from "./pages/equity-brain/CompradoresPage";
import MandatosTablePage from "./pages/equity-brain/MandatosTablePage";
import { RedirectWithParams } from "./components/equity-brain/RedirectWithParams";
import DashboardCoveragePage from "./pages/equity-brain/DashboardCoveragePage";
import DedupeAdminPage from "./pages/equity-brain/DedupeAdminPage";
import BenchmarkPage from "./pages/equity-brain/admin/BenchmarkPage";
import BuyerClassificationPage from "./pages/equity-brain/admin/BuyerClassificationPage";
import RfbHubPage from "./pages/equity-brain/admin/RfbHubPage";
import PropostasPage from "./pages/equity-brain/PropostasPage";

// App shell for authenticated end-users (sidebar + topbar)
import { AppShell } from "@/components/layout/AppShell";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ViewAsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ViewAsBanner />
          <Routes>
            <Route path="/" element={<Index />} />

            {/* Pure public-only routes — no shell wrapping */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/aguardando-aprovacao" element={<AwaitingApproval />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/comprar" element={<Investors />} />

            {/* Hybrid routes: AppShell wraps them; for visitors AppShell renders the page raw */}
            <Route element={<AppShell />}>
              {/* Tools (work for both visitors and logged-in users) */}
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/mapa" element={<MapView />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/vender" element={<Vender />} />
              <Route path="/anuncio/:id" element={<ListingDetail />} />
              <Route path="/valuation" element={<Valuation />} />
              <Route path="/mari" element={<MariCalculator />} />
              <Route path="/valuation/multiplos" element={<ValuationMultiplos />} />
              <Route path="/valuation/dcf" element={<ValuationDCF />} />
              <Route path="/valuation/certificador" element={<ValuationCertifier />} />
              <Route path="/capital" element={<Capital />} />
              <Route path="/matching" element={<Matching />} />
              <Route path="/teaser/:ticker" element={<BlindTeaser />} />

              {/* Authenticated-only routes (AppShell will redirect to /auth via the page itself) */}
              <Route path="/painel" element={<Painel />} />
              <Route path="/meus-anuncios" element={<MyListings />} />
              <Route path="/meus-anuncios/:id" element={<ListingCockpit />} />
              <Route path="/editar-anuncio/:id" element={<EditListing />} />
              <Route path="/meu-perfil" element={<MyProfile />} />
              <Route path="/meus-valuations" element={<MyValuations />} />
              <Route path="/cadastrar-comprador" element={<RegisterBuyer />} />
              <Route path="/minhas-captacoes" element={<MyCapitalRequests />} />
              <Route path="/minhas-captacoes/:id" element={<CapitalRequestDetail />} />
              <Route path="/matching/resultados" element={<MatchingResults />} />
              <Route path="/matching-compradores/:listingId" element={<MatchingBuyers />} />
              <Route path="/potencial-carteira" element={<RequireRole roles={["advisor","admin","franchisee"]} allowPartnerAccountant><PortfolioPotential /></RequireRole>} />
              <Route path="/parceiro" element={<RequireRole roles={["advisor","admin","franchisee"]} allowPartnerAccountant><PartnerDashboard /></RequireRole>} />

              {/* Top-level dashboards (admin/advisor) */}
              <Route path="/dashboard/executivo" element={<RequireRole roles={["admin", "advisor"]}><DashboardExecutivoPage /></RequireRole>} />
              <Route path="/dashboard/mandato"   element={<RequireRole roles={["admin", "advisor"]}><DashboardMandatoPage /></RequireRole>} />
              <Route path="/dashboard/match"     element={<RequireRole roles={["admin", "advisor"]}><DashboardMatchPage /></RequireRole>} />
              <Route path="/dashboard/nbo"       element={<RequireRole roles={["admin", "advisor"]}><DashboardNboPage /></RequireRole>} />

              {/* Admin (sidebar do AppShell + RequireRole) */}
              <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
              <Route path="/admin/crm" element={<RequireRole roles={["admin"]}><AdminCRM /></RequireRole>} />
              <Route path="/admin/users" element={<RequireRole roles={["admin"]}><AdminUsers /></RequireRole>} />
              <Route path="/admin/aprovacoes" element={<RequireRole roles={["admin"]}><AdminApprovals /></RequireRole>} />
              <Route path="/admin/advisors/:advisorId/whatsapp-setup" element={<RequireRole roles={["admin"]}><AdvisorWhatsAppSetup /></RequireRole>} />
              <Route path="/admin/whatsapp-monitor" element={<RequireRole roles={["admin"]}><AdminWhatsAppMonitor /></RequireRole>} />
              <Route path="/admin/listings" element={<RequireRole roles={["admin"]}><AdminListings /></RequireRole>} />
              <Route path="/admin/subscriptions" element={<RequireRole roles={["admin"]}><AdminSubscriptions /></RequireRole>} />
              <Route path="/admin/valuations" element={<RequireRole roles={["admin"]}><AdminValuations /></RequireRole>} />
              <Route path="/admin/parcerias" element={<RequireRole roles={["admin"]}><AdminPartnerships /></RequireRole>} />
              <Route path="/admin/capital" element={<RequireRole roles={["admin"]}><AdminCapital /></RequireRole>} />
              <Route path="/admin/capital/providers" element={<RequireRole roles={["admin"]}><AdminCapitalProviders /></RequireRole>} />
              <Route path="/admin/monday-import" element={<RequireRole roles={["admin"]}><MondayImport /></RequireRole>} />
              <Route path="/admin/api-monitor" element={<RequireRole roles={["admin"]}><AdminApiMonitor /></RequireRole>} />
              {/* legados — agora rodam dentro do shell EB */}
              <Route path="/admin/monday-parity" element={<Navigate to="/equity-brain/admin/monday-parity" replace />} />
              <Route path="/admin/advisors-mapping" element={<Navigate to="/equity-brain/admin/advisors-mapping" replace />} />
            </Route>

            
            {/* Capital SEO Pages */}
            <Route path="/capital/case/:slug" element={<CapitalCase />} />
            <Route path="/capital/setor/:slug" element={<CapitalBySegment />} />
            <Route path="/capital/cidade/:slug" element={<CapitalByCity />} />
            
            {/* Equity Brain — cockpit M&A interno */}
            <Route
              path="/equity-brain"
              element={
                <RequireRole roles={["admin", "advisor"]}>
                  <EquityBrainLayout />
                </RequireRole>
              }
            >
              <Route index               element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
              <Route path="hoje"          element={<TodayPage />} />

              {/* Novas páginas-wrapper */}
              <Route path="oportunidades" element={<EBOportunidadesPage />} />
              <Route path="pipeline"      element={<PipelinePage />} />
              <Route path="compradores"   element={<CompradoresPage />} />
              <Route path="mercado"       element={<NewsPage />} />

              {/* Submenu Dashboards (novas rotas) */}
              <Route path="dashboards/executivo" element={<DashboardExecutivoPage />} />
              <Route path="dashboards/mandatos"  element={<DashboardMandatoPage />} />
              <Route path="dashboards/match"     element={<DashboardMatchPage />} />
              <Route path="dashboards/propostas" element={<DashboardNboPage />} />

              {/* Submenu Admin (renames internos) */}
              <Route path="admin/imports"   element={<RequireRole roles={["admin", "advisor"]}><ImportsPage /></RequireRole>} />
              <Route path="admin/auditoria" element={<RequireRole roles={["admin"]}><CrmAuditPage /></RequireRole>} />
              <Route path="admin/shadow"    element={<EBShadowPage />} />
              <Route
                path="admin/jarvis"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-1px)] bg-zinc-950 text-emerald-300 text-sm">Carregando cérebro 3D…</div>}>
                    <EBGrafoJarvisPage />
                  </Suspense>
                }
              />

              {/* Redirects de rotas antigas */}
              <Route path="match-inbox"   element={<Navigate to="/equity-brain/oportunidades" replace />} />
              <Route path="crm"           element={<Navigate to="/equity-brain/pipeline" replace />} />
              <Route path="crm/minhas-empresas" element={<Navigate to="/equity-brain/pipeline?tab=empresas" replace />} />
              <Route path="mapa"          element={<Navigate to="/equity-brain/pipeline?view=mapa" replace />} />
              <Route path="grafo"         element={<Navigate to="/equity-brain/pipeline?view=grafo" replace />} />
              <Route path="crm/quick-fill" element={<Navigate to="/equity-brain/pipeline" replace />} />
              <Route path="mandate"       element={<Navigate to="/equity-brain/pipeline" replace />} />
              <Route path="mandate/:id"   element={<RedirectWithParams to="/equity-brain/crm/mandate/:id" />} />
              <Route path="mandato"       element={<Navigate to="/equity-brain/pipeline" replace />} />
              <Route path="mandatos"      element={<Navigate to="/equity-brain/pipeline" replace />} />
              <Route path="vendedores"    element={<Navigate to="/equity-brain/pipeline" replace />} />
              <Route path="mandate/new"   element={<Navigate to="/equity-brain/crm/mandate/new" replace />} />
              <Route path="mandato/novo"  element={<Navigate to="/equity-brain/crm/mandate/new" replace />} />
              <Route path="vendedor/novo" element={<Navigate to="/equity-brain/crm/mandate/new" replace />} />
              <Route path="buyers"        element={<Navigate to="/equity-brain/compradores" replace />} />
              <Route path="teses"         element={<Navigate to="/equity-brain/compradores?tab=teses" replace />} />
              <Route path="news"          element={<Navigate to="/equity-brain/mercado" replace />} />
              <Route path="board"         element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
              <Route path="dashboard/executivo" element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
              <Route path="dashboard/mandato"   element={<Navigate to="/equity-brain/dashboards/mandatos" replace />} />
              <Route path="dashboard/match"     element={<Navigate to="/equity-brain/dashboards/match" replace />} />
              <Route path="dashboard/nbo"       element={<Navigate to="/equity-brain/dashboards/propostas" replace />} />
              <Route path="crm/imports"   element={<Navigate to="/equity-brain/admin/imports" replace />} />
              <Route path="crm/admin/auditoria-operacional" element={<Navigate to="/equity-brain/admin/auditoria" replace />} />
              <Route path="shadow"        element={<Navigate to="/equity-brain/admin/shadow" replace />} />
              <Route path="grafo-jarvis"  element={<Navigate to="/equity-brain/admin/jarvis" replace />} />
              <Route path="match/:matchId" element={<MatchDetailPage />} />
              <Route
                path="grafo-jarvis/guia"
                element={
                  <Suspense fallback={<div className="p-10 text-zinc-400 text-sm">Carregando guia…</div>}>
                    <EBGrafoJarvisGuiaPage />
                  </Suspense>
                }
              />
              <Route path="calls"         element={<EBCallsPage />} />
              <Route path="empresa/:cnpj" element={<EBDealDetailPage />} />
              <Route path="crm/mandate/:id"      element={<MandateDetailPage />} />
              <Route path="crm/buyer/:id"        element={<BuyerDetailPage />} />
              <Route path="crm/admin/permissoes" element={<PermissionsAdminPage />} />
              <Route path="crm/admin/auditoria"  element={<RequireRole roles={["admin"]}><AccessAuditPage /></RequireRole>} />
              <Route path="crm/executivo"        element={<ExecutiveDashboardPage />} />
              <Route path="crm/matching"         element={<MatchAnalyticsPage />} />
              <Route path="crm/admin/atribuicoes" element={<RequireRole roles={["admin"]}><CrmAssignmentsPage /></RequireRole>} />
              <Route path="admin/health" element={<RequireRole roles={["admin"]}><HealthDashboardPage /></RequireRole>} />
              <Route path="crm/pipeline"         element={<PipelineKanbanPage />} />
              <Route path="crm/pipeline/historico" element={<PipelineHistoryPage />} />
              {/* deal/:id ainda não tem página própria — redireciona para mandate/:id preservando o id */}
              <Route path="deal/:id"             element={<RedirectWithParams to="/equity-brain/crm/mandate/:id" />} />
              <Route path="crm/exports"          element={<RequireRole roles={["admin"]}><ExportsPage /></RequireRole>} />
              <Route path="isp/import"           element={<RequireRole roles={["admin", "advisor"]}><IspImportPage /></RequireRole>} />
              <Route path="isp/sugestoes"        element={<RequireRole roles={["admin", "advisor"]}><IspSuggestionsPage /></RequireRole>} />
              <Route path="isp/mercado"          element={<RequireRole roles={["admin", "advisor"]}><IspMarketPage /></RequireRole>} />
              <Route path="crm/aberturas"        element={<RequireRole roles={["admin", "advisor"]}><DisclosuresPage /></RequireRole>} />
              <Route path="crm/mandate/new"      element={<RequireRole roles={["admin"]}><MandateFormPage /></RequireRole>} />
              <Route path="crm/mandate/:id/edit" element={<RequireRole roles={["admin"]}><MandateFormPage /></RequireRole>} />
              <Route path="mandatos/tabela"      element={<RequireRole roles={["admin","advisor"]}><MandatosTablePage /></RequireRole>} />
              <Route path="admin/dashboard-coverage" element={<RequireRole roles={["admin","advisor"]}><DashboardCoveragePage /></RequireRole>} />
              <Route path="admin/dedupe" element={<RequireRole roles={["admin"]}><DedupeAdminPage /></RequireRole>} />
              <Route path="admin/monday-parity"     element={<RequireRole roles={["admin"]}><MondayParity /></RequireRole>} />
              <Route path="admin/advisors-mapping"  element={<RequireRole roles={["admin"]}><AdvisorsMapping /></RequireRole>} />
              <Route path="admin/benchmark"               element={<RequireRole roles={["admin"]}><BenchmarkPage /></RequireRole>} />
              <Route path="admin/buyer-classification"    element={<RequireRole roles={["admin"]}><BuyerClassificationPage /></RequireRole>} />
              <Route path="admin/rfb"                     element={<RequireRole roles={["admin","advisor"]}><RfbHubPage /></RequireRole>} />
              <Route path="propostas/:matchId"            element={<RequireRole roles={["admin","advisor"]}><PropostasPage /></RequireRole>} />
              <Route path="propostas"                     element={<RequireRole roles={["admin","advisor"]}><PropostasPage /></RequireRole>} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsentBanner />
        </BrowserRouter>
      </TooltipProvider>
      </ViewAsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

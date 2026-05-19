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
import { usePageTracking } from "@/hooks/usePageTracking";

const PageTracker = () => { usePageTracking(); return null; };

// Eager: home + framework essentials. Everything else is code-split on demand.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/auth/RequireRole";
import { EquityBrainLayout } from "@/components/equity-brain/EquityBrainLayout";
import { RedirectWithParams } from "./components/equity-brain/RedirectWithParams";

// Public / hybrid pages
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const AwaitingApproval = lazy(() => import("./pages/AwaitingApproval"));
const Investors = lazy(() => import("./pages/Investors"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MapView = lazy(() => import("./pages/MapView"));
const Sell = lazy(() => import("./pages/Sell"));
const Vender = lazy(() => import("./pages/Vender"));
const InvestorSimulator = lazy(() => import("./pages/sell/InvestorSimulator"));
const DueDiligenceSimulator = lazy(() => import("./pages/sell/DueDiligenceSimulator"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Valuation = lazy(() => import("./pages/Valuation"));
const MariCalculator = lazy(() => import("./pages/MariCalculator"));
const ValuationMultiplos = lazy(() => import("./pages/ValuationMultiplos"));
const ValuationDCF = lazy(() => import("./pages/ValuationDCF"));
const ValuationCertifier = lazy(() => import("./pages/ValuationCertifier"));
const Capital = lazy(() => import("./pages/Capital"));
const Matching = lazy(() => import("./pages/Matching"));
const BlindTeaser = lazy(() => import("./pages/BlindTeaser"));

// Authenticated user pages
const Painel = lazy(() => import("./pages/Painel"));
const Inteligencia = lazy(() => import("./pages/Inteligencia"));
const MyListings = lazy(() => import("./pages/MyListings"));
const ListingCockpit = lazy(() => import("./pages/ListingCockpit"));
const EditListing = lazy(() => import("./pages/EditListing"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const DealRoomPage = lazy(() => import("./pages/buyer/DealRoomPage"));
const MyDealRoomsPage = lazy(() => import("./pages/buyer/DealRoomPage").then(m => ({ default: m.MyDealRoomsPage })));
const MyValuations = lazy(() => import("./pages/MyValuations"));
const RegisterBuyer = lazy(() => import("./pages/RegisterBuyer"));
const MyCapitalRequests = lazy(() => import("./pages/MyCapitalRequests"));
const CapitalRequestDetail = lazy(() => import("./pages/CapitalRequestDetail"));
const MatchingResults = lazy(() => import("./pages/MatchingResults"));
const MatchingBuyers = lazy(() => import("./pages/MatchingBuyers"));
const PortfolioPotential = lazy(() => import("./pages/PortfolioPotential"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const PartnerBuyersPage = lazy(() => import("./pages/parceiro/PartnerBuyersPage"));

// Capital SEO
const CapitalCase = lazy(() => import("./pages/CapitalCase"));
const CapitalBySegment = lazy(() => import("./pages/CapitalBySegment"));
const CapitalByCity = lazy(() => import("./pages/CapitalByCity"));

// Top-level dashboards
const DashboardExecutivoPage = lazy(() => import("./pages/dashboards/DashboardExecutivoPage"));
const DashboardMandatoPage = lazy(() => import("./pages/dashboards/DashboardMandatoPage"));
const DashboardMatchPage = lazy(() => import("./pages/dashboards/DashboardMatchPage"));
const DashboardNboPage = lazy(() => import("./pages/dashboards/DashboardNboPage"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdvisorWhatsAppSetup = lazy(() => import("./pages/admin/AdvisorWhatsAppSetup"));
const AdminWhatsAppMonitor = lazy(() => import("./pages/admin/AdminWhatsAppMonitor"));
const AdminListings = lazy(() => import("./pages/admin/AdminListings"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminValuations = lazy(() => import("./pages/admin/AdminValuations"));
const AdminPartnerships = lazy(() => import("./pages/admin/AdminPartnerships"));
const AdminCapital = lazy(() => import("./pages/admin/AdminCapital"));
const AdminCapitalProviders = lazy(() => import("./pages/admin/AdminCapitalProviders"));
const AdminCRM = lazy(() => import("./pages/admin/AdminCRM"));
const MondayImport = lazy(() => import("./pages/admin/MondayImport"));
const MondayParity = lazy(() => import("./pages/admin/MondayParity"));
const AdvisorsMapping = lazy(() => import("./pages/admin/AdvisorsMapping"));
const AdminApiMonitor = lazy(() => import("./pages/admin/AdminApiMonitor"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));

// Equity Brain
const EBOportunidadesPage = lazy(() => import("./pages/equity-brain/OportunidadesPage"));
const EBCallsPage = lazy(() => import("./pages/equity-brain/CallsPage"));
const EBDealDetailPage = lazy(() => import("./pages/equity-brain/DealDetailPage"));
const EBGrafoJarvisPage = lazy(() => import("./pages/equity-brain/GrafoJarvisPage"));
const EBGrafoJarvisGuiaPage = lazy(() => import("./pages/equity-brain/GrafoJarvisGuiaPage"));
const EBShadowPage = lazy(() => import("./pages/equity-brain/ShadowPage"));
const PermissionsAdminPage = lazy(() => import("./pages/equity-brain/PermissionsAdminPage"));
const MandateDetailPage = lazy(() => import("./pages/equity-brain/MandateDetailPage"));
const BuyerDetailPage = lazy(() => import("./pages/equity-brain/BuyerDetailPage"));
const AccessAuditPage = lazy(() => import("./pages/equity-brain/AccessAuditPage"));
const CrmAuditPage = lazy(() => import("./pages/equity-brain/CrmAuditPage"));
const CrmAssignmentsPage = lazy(() => import("./pages/equity-brain/CrmAssignmentsPage"));
const HealthDashboardPage = lazy(() => import("./pages/equity-brain/HealthDashboardPage"));
const TodayPage = lazy(() => import("./pages/equity-brain/TodayPage"));
const NewsPage = lazy(() => import("./pages/equity-brain/NewsPage"));
const ExecutiveDashboardPage = lazy(() => import("./pages/equity-brain/ExecutiveDashboardPage"));
const MatchAnalyticsPage = lazy(() => import("./pages/equity-brain/MatchAnalyticsPage"));
const MatchInboxPage = lazy(() => import("./pages/equity-brain/MatchInboxPage"));
const MatchDetailPage = lazy(() => import("./pages/equity-brain/MatchDetailPage"));
const PipelineKanbanPage = lazy(() => import("./pages/equity-brain/PipelineKanbanPage"));
const PipelineHistoryPage = lazy(() => import("./pages/equity-brain/PipelineHistoryPage"));
const MandateFormPage = lazy(() => import("./pages/equity-brain/MandateFormPage"));
const ExportsPage = lazy(() => import("./pages/equity-brain/ExportsPage"));
const ImportsPage = lazy(() => import("./pages/equity-brain/ImportsPage"));
const IspImportPage = lazy(() => import("./pages/equity-brain/IspImportPage"));
const IspSuggestionsPage = lazy(() => import("./pages/equity-brain/IspSuggestionsPage"));
const IspMarketPage = lazy(() => import("./pages/equity-brain/IspMarketPage"));
const VerticalMarketPage = lazy(() => import("./pages/equity-brain/VerticalMarketPage"));
const VerticalImportPage = lazy(() => import("./pages/equity-brain/VerticalImportPage"));
const DisclosuresPage = lazy(() => import("./pages/equity-brain/DisclosuresPage"));
const UnifiedDealPage = lazy(() => import("./pages/equity-brain/UnifiedDealPage"));
const PipelinePage = lazy(() => import("./pages/equity-brain/PipelinePage"));
const CompradoresPage = lazy(() => import("./pages/equity-brain/CompradoresPage"));
const MandatosTablePage = lazy(() => import("./pages/equity-brain/MandatosTablePage"));
const DashboardCoveragePage = lazy(() => import("./pages/equity-brain/DashboardCoveragePage"));
const DedupeAdminPage = lazy(() => import("./pages/equity-brain/DedupeAdminPage"));
const BenchmarkPage = lazy(() => import("./pages/equity-brain/admin/BenchmarkPage"));
const BuyerClassificationPage = lazy(() => import("./pages/equity-brain/admin/BuyerClassificationPage"));
const RfbHubPage = lazy(() => import("./pages/equity-brain/admin/RfbHubPage"));
const PropostasPage = lazy(() => import("./pages/equity-brain/PropostasPage"));
const DailyDiaryPage = lazy(() => import("./pages/equity-brain/DailyDiaryPage"));
const TagPage = lazy(() => import("./pages/equity-brain/TagPage"));
const NoteSearchPage = lazy(() => import("./pages/equity-brain/NoteSearchPage"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const RouteFallback = () => (
  <div className="min-h-[100dvh] bg-background">
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-md bg-muted/60" />
        <div className="h-4 w-72 rounded bg-muted/40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border/50 bg-card/40" />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-border/50 bg-card/40 mt-6" />
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ViewAsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ViewAsBanner />
          <PageTracker />
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/vender/simulador-investidor" element={<InvestorSimulator />} />
              <Route path="/vender/due-diligence" element={<DueDiligenceSimulator />} />
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
              <Route path="/inteligencia" element={<Inteligencia />} />
              <Route path="/meus-anuncios" element={<MyListings />} />
              <Route path="/meus-anuncios/:id" element={<ListingCockpit />} />
              <Route path="/editar-anuncio/:id" element={<EditListing />} />
              <Route path="/meu-perfil" element={<MyProfile />} />
              <Route path="/meus-valuations" element={<MyValuations />} />
              <Route path="/cadastrar-comprador" element={<RegisterBuyer />} />
              <Route path="/minhas-captacoes" element={<MyCapitalRequests />} />
              <Route path="/salas" element={<MyDealRoomsPage />} />
              <Route path="/salas/:id" element={<DealRoomPage />} />
              <Route path="/minhas-captacoes/:id" element={<CapitalRequestDetail />} />
              <Route path="/matching/resultados" element={<MatchingResults />} />
              <Route path="/matching-compradores/:listingId" element={<MatchingBuyers />} />
              <Route path="/potencial-carteira" element={<RequireRole roles={["advisor","admin","franchisee"]} allowPartnerAccountant><PortfolioPotential /></RequireRole>} />
              <Route path="/parceiro" element={<RequireRole roles={["advisor","admin","franchisee"]} allowPartnerAccountant><PartnerDashboard /></RequireRole>} />
              <Route path="/parceiro/compradores" element={<RequireRole roles={["advisor","admin","franchisee"]} allowPartnerAccountant><PartnerBuyersPage /></RequireRole>} />

              {/* Top-level dashboards (admin/advisor) */}
              <Route path="/dashboard/executivo" element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
              <Route path="/dashboard/mandato"   element={<Navigate to="/equity-brain/dashboards/mandatos"  replace />} />
              <Route path="/dashboard/match"     element={<Navigate to="/equity-brain/dashboards/match"     replace />} />
              <Route path="/dashboard/nbo"       element={<Navigate to="/equity-brain/dashboards/propostas" replace />} />

              {/* Admin (sidebar do AppShell + RequireRole) */}
              <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
              <Route path="/admin/crm" element={<RequireRole roles={["admin"]}><AdminCRM /></RequireRole>} />
              <Route path="/admin/users" element={<RequireRole roles={["admin"]}><AdminUsers /></RequireRole>} />
              <Route path="/admin/users/:userId" element={<RequireRole roles={["admin"]}><AdminUserDetail /></RequireRole>} />
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
              <Route path="/admin/analytics" element={<RequireRole roles={["admin"]}><AdminAnalytics /></RequireRole>} />
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
                <RequireRole roles={["admin", "advisor"]} denyPartnerAccountant>
                  <EquityBrainLayout />
                </RequireRole>
              }
            >
              <Route index               element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
              <Route path="hoje"          element={<TodayPage />} />
              <Route path="diario"         element={<DailyDiaryPage />} />
              <Route path="diario/:date"   element={<DailyDiaryPage />} />
              <Route path="tag/:slug"      element={<TagPage />} />
              <Route path="busca-notas"    element={<NoteSearchPage />} />

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
              <Route path="admin/jarvis"    element={<EBGrafoJarvisPage />} />

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
              <Route path="grafo-jarvis/guia" element={<EBGrafoJarvisGuiaPage />} />
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
              <Route path="vertical/:slug/mercado" element={<RequireRole roles={["admin", "advisor"]}><VerticalMarketPage /></RequireRole>} />
              <Route path="vertical/:slug/import"  element={<RequireRole roles={["admin", "advisor"]}><VerticalImportPage /></RequireRole>} />
              <Route path="vertical/import"        element={<RequireRole roles={["admin", "advisor"]}><VerticalImportPage /></RequireRole>} />
              <Route path="anatel/cruzamento"    element={<Navigate to="/equity-brain/mercado?tab=anatel" replace />} />
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
          </Suspense>
          <CookieConsentBanner />
        </BrowserRouter>
      </TooltipProvider>
      </ViewAsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

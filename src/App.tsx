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
import { GenerationTrackerProvider, GenerationToaster } from "@/components/legal/GenerationTracker";

const PageTracker = () => { usePageTracking(); return null; };

// Eager: home + framework essentials. Everything else is code-split on demand.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/layout/RouteLoader";
import { RequireRole } from "@/components/auth/RequireRole";
import { EquityBrainLayout } from "@/components/equity-brain/EquityBrainLayout";
import { RedirectWithParams } from "./components/equity-brain/RedirectWithParams";

// Public / hybrid pages
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const HomologacaoPublica = lazy(() => import("./pages/legal/HomologacaoPublica"));
const AssinaturaPublica = lazy(() => import("./pages/legal/AssinaturaPublica"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
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
const PlanoPerfeito = lazy(() => import("./pages/PlanoPerfeito"));
const MeusPlanosPerfeitos = lazy(() => import("./pages/MeusPlanosPerfeitos"));
const EquityPlanner = lazy(() => import("./pages/EquityPlanner"));
const EquityPlannerNew = lazy(() => import("./pages/EquityPlannerNew"));
const EquityPlannerAssessment = lazy(() => import("./pages/EquityPlannerAssessment"));
const EquityPlannerReport = lazy(() => import("./pages/EquityPlannerReport"));
const MyEquityPlanners = lazy(() => import("./pages/MyEquityPlanners"));
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
const AdminLettersSettings = lazy(() => import("./pages/admin/AdminLettersSettings"));

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
const LetterTemplatesPage = lazy(() => import("./pages/equity-brain/cartas/LetterTemplatesPage"));
const LetterHistoryPage = lazy(() => import("./pages/equity-brain/cartas/LetterHistoryPage"));
const DealPairDetailPage = lazy(() => import("./pages/equity-brain/DealPairDetailPage"));
const NboWizardPage = lazy(() => import("./pages/equity-brain/NboWizardPage"));
const LegalLibraryPage = lazy(() => import("./pages/equity-brain/LegalLibraryPage"));

// /investir — REDE SOCIAL PATRIMONIAL (feed, perfis, ligas, missões)
const FeedHome = lazy(() => import("./pages/investir/FeedHome"));
const PerfilEmpresa = lazy(() => import("./pages/investir/PerfilEmpresa"));
const Descobrir = lazy(() => import("./pages/investir/Descobrir"));
const Missoes = lazy(() => import("./pages/investir/Missoes"));
const Ligas = lazy(() => import("./pages/investir/Ligas"));
const Fantasy = lazy(() => import("./pages/investir/Fantasy"));
const Lives = lazy(() => import("./pages/investir/Lives"));
const Quiz = lazy(() => import("./pages/investir/Quiz"));
const Comparar = lazy(() => import("./pages/investir/Comparar"));
const StoriesManager = lazy(() => import("./pages/investir/founder/StoriesManager"));
const InvestirAMariLanding = lazy(() => import("./pages/investir/sobre/InvestirAMariLanding"));
// Legacy /investir pages (mantidas pra rotas regulatórias e fluxo de reserva)
const InvestirListagem = lazy(() => import("./pages/investir/InvestirListagem"));
const InvestirAtivo = lazy(() => import("./pages/investir/InvestirAtivo"));
const InvestirAuth = lazy(() => import("./pages/investir/InvestirAuth"));
const InvestirDashboard = lazy(() => import("./pages/investir/InvestirDashboard"));
const InvestirWallet = lazy(() => import("./pages/investir/InvestirWallet"));
const InvestirReservas = lazy(() => import("./pages/investir/InvestirReservas"));
const InvestirKYC = lazy(() => import("./pages/investir/onboarding/InvestirKYC"));
const InvestirSuitability = lazy(() => import("./pages/investir/onboarding/InvestirSuitability"));
const InvestirInteresses = lazy(() => import("./pages/investir/onboarding/InvestirInteresses"));
const InvestirComoFunciona = lazy(() => import("./pages/investir/InvestirComoFunciona"));
const InvestirRiscos = lazy(() => import("./pages/investir/InvestirRiscos"));
const InvestirRegulamentacao = lazy(() => import("./pages/investir/InvestirRegulamentacao"));
const InvestirSobre = lazy(() => import("./pages/investir/sobre/InvestirSobre"));
const InvestirAMari = lazy(() => import("./pages/investir/sobre/InvestirAMari"));
const InvestirQuemSomos = lazy(() => import("./pages/investir/sobre/InvestirQuemSomos"));
const InvestirVantagens = lazy(() => import("./pages/investir/sobre/InvestirVantagens"));
const InvestirPoliticas = lazy(() => import("./pages/investir/politicas/InvestirPoliticas"));
const InvestirPrivacidade = lazy(() => import("./pages/investir/politicas/InvestirPrivacidade"));
const InvestirCookies = lazy(() => import("./pages/investir/politicas/InvestirCookies"));
const InvestirCarreiras = lazy(() => import("./pages/investir/InvestirCarreiras"));
const InvestirProdutos = lazy(() => import("./pages/investir/produtos/InvestirProdutos"));
const InvestirInvestimentos = lazy(() => import("./pages/investir/produtos/InvestirInvestimentos"));
const InvestirSimulador = lazy(() => import("./pages/investir/produtos/InvestirSimulador"));
const InvestirFerramentas = lazy(() => import("./pages/investir/ferramentas/InvestirFerramentas"));
const InvestirApp = lazy(() => import("./pages/investir/ferramentas/InvestirApp"));
const InvestirHomeBroker = lazy(() => import("./pages/investir/ferramentas/InvestirHomeBroker"));
const InvestirCartao = lazy(() => import("./pages/investir/servicos/InvestirCartao"));
const InvestirBlog = lazy(() => import("./pages/investir/InvestirBlog"));
const InvestirCustos = lazy(() => import("./pages/investir/InvestirCustos"));
const InvestirAjuda = lazy(() => import("./pages/investir/InvestirAjuda"));
const InvestirDicionario = lazy(() => import("./pages/investir/InvestirDicionario"));
const InvestirAtendimento = lazy(() => import("./pages/investir/atendimento/InvestirAtendimento"));
const InvestirAtendimentoCVM = lazy(() => import("./pages/investir/atendimento/InvestirAtendimentoCVM"));
const InvestirAtendimentoRMP = lazy(() => import("./pages/investir/atendimento/InvestirAtendimentoRMP"));
const InvestirOuvidoria = lazy(() => import("./pages/investir/atendimento/InvestirOuvidoria"));
const AdminTokenizacao = lazy(() => import("./pages/admin/AdminTokenizacao"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const RouteFallback = () => <FullPageLoader />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ViewAsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GenerationTrackerProvider>
          <GenerationToaster />
          <ViewAsBanner />
          <PageTracker />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />

            {/* Pure public-only routes — no shell wrapping */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/homologacao/:token" element={<HomologacaoPublica />} />
            <Route path="/assinar/:token" element={<AssinaturaPublica />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/aguardando-aprovacao" element={<AwaitingApproval />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/comprar" element={<Investors />} />

            {/* /investir — Rede social patrimonial */}
            <Route path="/investir" element={<FeedHome />} />
            <Route path="/investir/empresa/:symbol" element={<PerfilEmpresa />} />
            <Route path="/investir/empresa/:symbol/stories" element={<StoriesManager />} />
            <Route path="/investir/descobrir" element={<Descobrir />} />
            <Route path="/investir/missoes" element={<Missoes />} />
            <Route path="/investir/ligas" element={<Ligas />} />
            <Route path="/investir/fantasy" element={<Fantasy />} />
            <Route path="/investir/lives" element={<Lives />} />
            <Route path="/investir/quiz" element={<Quiz />} />
            <Route path="/investir/comparar" element={<Comparar />} />
            <Route path="/investir/sobre-a-mari" element={<InvestirAMariLanding />} />
            {/* Legacy redirects */}
            <Route path="/investir/empresas" element={<InvestirListagem />} />
            <Route path="/investir/ativo/:symbol" element={<InvestirAtivo />} />
            <Route path="/investir/auth" element={<InvestirAuth />} />
            <Route path="/investir/painel" element={<InvestirDashboard />} />
            <Route path="/investir/carteira" element={<InvestirWallet />} />
            <Route path="/investir/reservas" element={<InvestirReservas />} />
            <Route path="/investir/onboarding/interesses" element={<InvestirInteresses />} />
            <Route path="/investir/onboarding/kyc" element={<InvestirKYC />} />
            <Route path="/investir/onboarding/suitability" element={<InvestirSuitability />} />
            <Route path="/investir/como-funciona" element={<InvestirComoFunciona />} />
            <Route path="/investir/riscos" element={<InvestirRiscos />} />
            <Route path="/investir/regulamentacao" element={<InvestirRegulamentacao />} />
            <Route path="/investir/sobre" element={<InvestirSobre />} />
            <Route path="/investir/sobre/a-mari" element={<InvestirAMari />} />
            <Route path="/investir/sobre/quem-somos" element={<InvestirQuemSomos />} />
            <Route path="/investir/sobre/vantagens" element={<InvestirVantagens />} />
            <Route path="/investir/politicas" element={<InvestirPoliticas />} />
            <Route path="/investir/politicas/privacidade" element={<InvestirPrivacidade />} />
            <Route path="/investir/politicas/cookies" element={<InvestirCookies />} />
            <Route path="/investir/carreiras" element={<InvestirCarreiras />} />
            <Route path="/investir/produtos" element={<InvestirProdutos />} />
            <Route path="/investir/produtos/investimentos" element={<InvestirInvestimentos />} />
            <Route path="/investir/produtos/simulador" element={<InvestirSimulador />} />
            <Route path="/investir/ferramentas" element={<InvestirFerramentas />} />
            <Route path="/investir/ferramentas/app" element={<InvestirApp />} />
            <Route path="/investir/ferramentas/home-broker" element={<InvestirHomeBroker />} />
            <Route path="/investir/servicos/cartao" element={<InvestirCartao />} />
            <Route path="/investir/blog" element={<InvestirBlog />} />
            <Route path="/investir/custos" element={<InvestirCustos />} />
            <Route path="/investir/ajuda" element={<InvestirAjuda />} />
            <Route path="/investir/ajuda/dicionario" element={<InvestirDicionario />} />
            <Route path="/investir/atendimento" element={<InvestirAtendimento />} />
            <Route path="/investir/atendimento/cvm" element={<InvestirAtendimentoCVM />} />
            <Route path="/investir/atendimento/rmp" element={<InvestirAtendimentoRMP />} />
            <Route path="/investir/atendimento/ouvidoria" element={<InvestirOuvidoria />} />

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
              <Route path="/valuation/plano-perfeito" element={<PlanoPerfeito />} />
              <Route path="/equity-planner" element={<EquityPlanner />} />
              <Route path="/equity-planner/novo" element={<EquityPlannerNew />} />
              <Route path="/equity-planner/:id" element={<EquityPlannerAssessment />} />
              <Route path="/equity-planner/:id/relatorio" element={<EquityPlannerReport />} />
              <Route path="/meus-equity-planners" element={<MyEquityPlanners />} />
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
              <Route path="/meus-planos-perfeitos" element={<MeusPlanosPerfeitos />} />
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
              <Route path="/admin/cartas-grafica" element={<RequireRole roles={["admin"]}><AdminLettersSettings /></RequireRole>} />
              <Route path="/admin/tokenizacao" element={<RequireRole roles={["admin"]}><AdminTokenizacao /></RequireRole>} />
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
              <Route path="cartas/modelos" element={<RequireRole roles={["admin"]}><LetterTemplatesPage /></RequireRole>} />
              <Route path="cartas/historico" element={<LetterHistoryPage />} />
              <Route path="par/:id" element={<DealPairDetailPage />} />
              <Route path="par/:id/nbo" element={<RequireRole roles={["admin", "advisor", "legal"]}><NboWizardPage /></RequireRole>} />
              <Route path="legal/biblioteca" element={<RequireRole roles={["admin", "advisor", "legal", "observer"]}><LegalLibraryPage /></RequireRole>} />
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
              {/* Rotas legadas consolidadas nos dashboards oficiais */}
              <Route path="crm/executivo"        element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
              <Route path="crm/matching"         element={<Navigate to="/equity-brain/dashboards/match" replace />} />
              <Route path="crm/admin/atribuicoes" element={<RequireRole roles={["admin"]}><CrmAssignmentsPage /></RequireRole>} />
              <Route path="admin/health" element={<RequireRole roles={["admin"]}><HealthDashboardPage /></RequireRole>} />
              <Route path="crm/pipeline"         element={<Navigate to="/equity-brain/pipeline" replace />} />
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
          </GenerationTrackerProvider>
        </BrowserRouter>
      </TooltipProvider>
      </ViewAsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

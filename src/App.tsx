import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import MyProfile from "./pages/MyProfile";
import MyValuations from "./pages/MyValuations";
import Valuation from "./pages/Valuation";
import ValuationMultiplos from "./pages/ValuationMultiplos";
import ValuationDCF from "./pages/ValuationDCF";
import ValuationCertifier from "./pages/ValuationCertifier";
import Investors from "./pages/Investors";
import Capital from "./pages/Capital";
import Auth from "./pages/Auth";
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

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminValuations from "./pages/admin/AdminValuations";
import AdminPartnerships from "./pages/admin/AdminPartnerships";
import AdminCapital from "./pages/admin/AdminCapital";
import AdminCapitalProviders from "./pages/admin/AdminCapitalProviders";
import AdminCRM from "./pages/admin/AdminCRM";
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
import EBBoardPage from "./pages/equity-brain/BoardPage";
import EBShadowPage from "./pages/equity-brain/ShadowPage";

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
            <Route path="/terms" element={<Terms />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/investors" element={<Investors />} />

            {/* Hybrid routes: AppShell wraps them; for visitors AppShell renders the page raw */}
            <Route element={<AppShell />}>
              {/* Tools (work for both visitors and logged-in users) */}
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/mapa" element={<MapView />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/vender" element={<Vender />} />
              <Route path="/anuncio/:id" element={<ListingDetail />} />
              <Route path="/valuation" element={<Valuation />} />
              <Route path="/valuation/multiplos" element={<ValuationMultiplos />} />
              <Route path="/valuation/dcf" element={<ValuationDCF />} />
              <Route path="/valuation/certificador" element={<ValuationCertifier />} />
              <Route path="/capital" element={<Capital />} />
              <Route path="/matching" element={<Matching />} />
              <Route path="/teaser/:ticker" element={<BlindTeaser />} />

              {/* Authenticated-only routes (AppShell will redirect to /auth via the page itself) */}
              <Route path="/painel" element={<Painel />} />
              <Route path="/meus-anuncios" element={<MyListings />} />
              <Route path="/editar-anuncio/:id" element={<EditListing />} />
              <Route path="/meu-perfil" element={<MyProfile />} />
              <Route path="/meus-valuations" element={<MyValuations />} />
              <Route path="/cadastrar-comprador" element={<RegisterBuyer />} />
              <Route path="/minhas-captacoes" element={<MyCapitalRequests />} />
              <Route path="/minhas-captacoes/:id" element={<CapitalRequestDetail />} />
              <Route path="/matching/resultados" element={<MatchingResults />} />
              <Route path="/matching-compradores/:listingId" element={<MatchingBuyers />} />
              <Route path="/potencial-carteira" element={<PortfolioPotential />} />
              <Route path="/parceiro" element={<PartnerDashboard />} />

              {/* Admin (sidebar do AppShell + RequireRole) */}
              <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
              <Route path="/admin/crm" element={<RequireRole roles={["admin"]}><AdminCRM /></RequireRole>} />
              <Route path="/admin/users" element={<RequireRole roles={["admin"]}><AdminUsers /></RequireRole>} />
              <Route path="/admin/listings" element={<RequireRole roles={["admin"]}><AdminListings /></RequireRole>} />
              <Route path="/admin/subscriptions" element={<RequireRole roles={["admin"]}><AdminSubscriptions /></RequireRole>} />
              <Route path="/admin/valuations" element={<RequireRole roles={["admin"]}><AdminValuations /></RequireRole>} />
              <Route path="/admin/parcerias" element={<RequireRole roles={["admin"]}><AdminPartnerships /></RequireRole>} />
              <Route path="/admin/capital" element={<RequireRole roles={["admin"]}><AdminCapital /></RequireRole>} />
              <Route path="/admin/capital/providers" element={<RequireRole roles={["admin"]}><AdminCapitalProviders /></RequireRole>} />
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
              <Route index               element={<EBDashboardPage />} />
              <Route path="oportunidades" element={<EBOportunidadesPage />} />
              <Route path="mapa"          element={<EBMapaPage />} />
              <Route path="grafo"         element={<EBGrafoPage />} />
              <Route path="buyers"        element={<EBBuyersPage />} />
              <Route path="teses"         element={<EBTesesPage />} />
              <Route path="calls"         element={<EBCallsPage />} />
              <Route path="empresa/:cnpj" element={<EBDealDetailPage />} />
              <Route path="board"         element={<EBBoardPage />} />
              <Route path="shadow"        element={<EBShadowPage />} />
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

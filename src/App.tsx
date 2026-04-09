import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
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
import MatchingBuyers from "./pages/MatchingBuyers";
import CapitalCase from "./pages/CapitalCase";
import CapitalBySegment from "./pages/CapitalBySegment";
import CapitalByCity from "./pages/CapitalByCity";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/mapa" element={<MapView />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/vender" element={<Vender />} />
            <Route path="/anuncio/:id" element={<ListingDetail />} />
            <Route path="/meus-anuncios" element={<MyListings />} />
            <Route path="/editar-anuncio/:id" element={<EditListing />} />
            <Route path="/meu-perfil" element={<MyProfile />} />
            <Route path="/meus-valuations" element={<MyValuations />} />
            <Route path="/valuation" element={<Valuation />} />
            <Route path="/valuation/multiplos" element={<ValuationMultiplos />} />
            <Route path="/valuation/dcf" element={<ValuationDCF />} />
            <Route path="/valuation/certificador" element={<ValuationCertifier />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/matching/resultados" element={<MatchingResults />} />
            <Route path="/teaser/:ticker" element={<BlindTeaser />} />
            <Route path="/cadastrar-comprador" element={<RegisterBuyer />} />
            <Route path="/minhas-captacoes" element={<MyCapitalRequests />} />
            <Route path="/minhas-captacoes/:id" element={<CapitalRequestDetail />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/listings" element={<AdminListings />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/valuations" element={<AdminValuations />} />
            <Route path="/admin/parcerias" element={<AdminPartnerships />} />
            <Route path="/admin/capital" element={<AdminCapital />} />
            <Route path="/admin/capital/providers" element={<AdminCapitalProviders />} />
            <Route path="/matching-compradores/:listingId" element={<MatchingBuyers />} />
            
            {/* Capital SEO Pages */}
            <Route path="/capital/case/:slug" element={<CapitalCase />} />
            <Route path="/capital/setor/:slug" element={<CapitalBySegment />} />
            <Route path="/capital/cidade/:slug" element={<CapitalByCity />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsentBanner />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

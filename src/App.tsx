import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import Sell from "./pages/Sell";
import Vender from "./pages/Vender";
import ListingDetail from "./pages/ListingDetail";
import MyListings from "./pages/MyListings";
import Valuation from "./pages/Valuation";
import Investors from "./pages/Investors";
import Capital from "./pages/Capital";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
            <Route path="/sell" element={<Sell />} />
            <Route path="/vender" element={<Vender />} />
            <Route path="/anuncio/:id" element={<ListingDetail />} />
            <Route path="/meus-anuncios" element={<MyListings />} />
            <Route path="/valuation" element={<Valuation />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/capital" element={<Capital />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

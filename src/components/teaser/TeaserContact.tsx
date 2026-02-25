import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface TeaserContactProps {
  listingId: string;
  ticker: string;
}

const TeaserContact = ({ listingId, ticker }: TeaserContactProps) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            listing_id: listingId,
            sender_name: form.name.trim(),
            sender_email: form.email.trim(),
            sender_phone: form.phone?.trim() || undefined,
            message: form.message.trim(),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Muitas mensagens enviadas. Aguarde alguns minutos.');
          return;
        }
        const data = await response.json();
        toast.error(data.error || 'Erro ao enviar mensagem.');
        return;
      }

      toast.success('Mensagem enviada com sucesso!');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const whatsappMessage = `Olá! Tenho interesse no ativo ${ticker} divulgado na PME.B3. Gostaria de mais informações.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <section className="relative py-20 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      {/* Gold decorative arc */}
      <div className="absolute right-0 top-0 bottom-0 w-[400px] pointer-events-none">
        <svg viewBox="0 0 400 800" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
          <path
            d="M 50 0 Q 400 200, 300 400 Q 200 600, 50 800"
            fill="none"
            stroke="hsl(38, 92%, 50%)"
            strokeWidth="2"
            opacity="0.4"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center mb-4 uppercase tracking-wider"
        >
          Contato
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-white/50 text-center mb-12"
        >
          Demonstre seu interesse neste ativo de forma confidencial
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-6 sm:p-8 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="t-name" className="text-white/70">Nome *</Label>
              <Input
                id="t-name"
                required
                placeholder="Seu nome"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-email" className="text-white/70">E-mail *</Label>
              <Input
                id="t-email"
                type="email"
                required
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-phone" className="text-white/70">Telefone</Label>
            <Input
              id="t-phone"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-msg" className="text-white/70">Mensagem *</Label>
            <Textarea
              id="t-msg"
              required
              rows={4}
              placeholder="Descreva seu interesse..."
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={isSending}
              className="flex-1 gradient-gold text-gray-900 font-bold hover:opacity-90 border-0"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </motion.form>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-500/60" />
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Confidencialidade</span>
          </div>
          <p className="text-xs text-white/30 max-w-lg mx-auto leading-relaxed">
            Este teaser foi elaborado pela PME.B3, é de extrema confidencialidade e não poderá ser compartilhado 
            por outras fontes. A veracidade e a acurácia das informações aqui demonstradas são de responsabilidade 
            exclusiva do fornecedor.
          </p>
          <p className="text-sm font-semibold text-white/50 mt-6 tracking-widest">PME.B3</p>
        </motion.div>
      </div>
    </section>
  );
};

export default TeaserContact;

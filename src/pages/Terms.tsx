import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Termo de Uso e Política de Privacidade
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Versão 2.0 — Junho de 2026
        </p>

        <div className="mb-10 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">
          <strong>Atualização v2.0 pendente de inserção.</strong> O texto abaixo é a versão anterior e
          permanece válido enquanto a revisão jurídica da v2.0 (Jun/2026) não é colada nesta página.
          Para a Política de Privacidade completa em conformidade com a LGPD, acesse{' '}
          <a href="/privacidade" className="underline font-medium">/privacidade</a>.
        </div>

        <div className="space-y-10 text-muted-foreground">
          {/* Seção 1 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Definições e Objeto</h2>
            <p className="leading-relaxed">
              As presentes Condições Gerais de Uso e a Política de Privacidade da empresa VISPE CAPITAL CONSULTORIA EMPRESARIAL LTDA, inscrita no CNPJ/MF sob o nº 31.526.112/0001-04, têm como intuito regulamentar a nossa relação com os nossos clientes. O documento esclarece o uso da nossa plataforma online e reflete o nosso compromisso com a segurança, privacidade e transparência no tratamento das suas informações ("Dados").
            </p>
          </section>

          {/* Seção 2 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Condições Gerais de Acesso e Uso</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>O acesso à plataforma e demais sistemas digitais é liberado ao usuário após o preenchimento de cadastro com as informações e documentos obrigatórios solicitados.</li>
              <li>Ao se cadastrar e utilizar as funcionalidades, o usuário declara ser maior de 18 (dezoito) anos e compromete-se a ler integralmente estes termos.</li>
              <li>A utilização das ferramentas da plataforma importa na adesão e aceitação expressa às presentes Condições Gerais de Uso.</li>
              <li>O usuário é o único responsável pelas informações fornecidas em seu cadastro e declara a veracidade e exatidão das mesmas.</li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Natureza dos Serviços e Responsabilidades</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>A Vispe Capital atua como uma ferramenta de conexão entre usuários (compradores, vendedores e investidores) e não é proprietária dos empreendimentos oferecidos nos conteúdos digitais.</li>
              <li>A empresa não intervém na formação dos valores e ofertas de compra/venda e não se responsabiliza pela concretização dos negócios jurídicos no ambiente digital.</li>
              <li>O usuário reconhece que o acesso à plataforma é fornecido sem garantia de sucesso no negócio e que o uso é de seu risco exclusivo.</li>
              <li>Não nos responsabilizamos por interrupções de acesso devidas a falhas de energia, conexão de internet ou outros fatores fora do controle da empresa.</li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Contratação, Pagamentos e Serviços Específicos</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li><strong className="text-foreground">Escopo de Serviços:</strong> A plataforma oferece planos para anúncio de empresas, elaboração de laudos de Valuation (avaliação de empresas) e assessoria técnica para captação de recursos.</li>
              <li><strong className="text-foreground">Liberação de Recursos:</strong> Os serviços pagos terão seus recursos e entregas (como laudos técnicos) liberados somente após a identificação da quitação do valor junto às páginas de pagamento vinculadas.</li>
              <li><strong className="text-foreground">Taxas de Sucesso:</strong> No caso de intermediação ou captação de recursos bem-sucedida, as taxas de sucesso (success fee) serão regidas por contrato particular específico entre as partes.</li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Conduta dos Usuários e Regras para Anúncios</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>O usuário compromete-se a utilizar a plataforma de acordo com a legislação vigente, a moral e a ordem pública.</li>
              <li>É terminantemente proibido o uso da plataforma para atividades ilícitas, crimes ou que infrinjam direitos de propriedade intelectual de terceiros.</li>
              <li>A Vispe Capital reserva-se o direito de remover anúncios, imagens e usuários que não estejam de acordo com estes termos.</li>
              <li>A empresa não se responsabiliza por imprecisões, erros ou fraudes nos dados enviados pelos usuários para publicação.</li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Propriedade Intelectual</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>Salvo autorização expressa, o usuário não poderá reproduzir, modificar ou distribuir qualquer elemento de conteúdo da plataforma.</li>
              <li>O usuário autoriza a Vispe Capital a reproduzir e distribuir as fotografias e dados enviados para inserção em anúncios na plataforma.</li>
              <li>A empresa está autorizada a adicionar marcas d'água nos anúncios para evitar o aproveitamento não consentido de dados por terceiros.</li>
            </ul>
          </section>

          {/* Seção 7 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Política de Privacidade e Dados (LGPD)</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilizamos medidas adequadas para garantir a proteção das informações.</li>
              <li><strong className="text-foreground">Compartilhamento Estratégico:</strong> O usuário reconhece e concorda que a base de dados poderá ser cedida ou compartilhada com terceiros (como potenciais investidores ou compradores), desde que respeitada a finalidade única de dar continuidade à atividade de intermediação e M&A.</li>
              <li>Os dados pessoais poderão ser conservados em nossos arquivos para fins de auditoria ou disposição de autoridades administrativas, mesmo após o término da relação contratual.</li>
            </ul>
          </section>

          {/* Seção 8 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Cancelamento e Comunicações</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>O cadastro implica autorização para o envio de informações comerciais e publicitárias, que pode ser revogada a qualquer momento através de link próprio ou solicitação direta.</li>
              <li>O usuário pode solicitar o cancelamento do recebimento de mensagens e o encerramento de sua conta através do e-mail de atendimento.</li>
            </ul>
          </section>

          {/* Seção 9 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Modificações e Término</h2>
            <ul className="list-disc list-inside space-y-3 leading-relaxed">
              <li>Estas Condições Gerais de Uso podem sofrer alterações periódicas por questões legais ou estratégicas da Vispe Capital.</li>
              <li>A empresa reserva-se o direito de decidir sobre o encerramento, suspensão ou interrupção das funcionalidades oferecidas a qualquer momento, sem necessidade de aviso prévio.</li>
            </ul>
          </section>

          {/* Seção 10 */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Lei e Jurisdição</h2>
            <p className="leading-relaxed">
              Todas as questões relativas a este Termo de Uso e Política de Privacidade serão regidas pelas leis brasileiras e se submeterão ao foro da Comarca de Porto Alegre, RS.
            </p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;

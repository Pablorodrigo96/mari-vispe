import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";

const tipos = [
  { t: "Estritamente necessários", d: "Mantêm sua sessão ativa, lembram suas preferências de cookie e protegem a plataforma contra fraudes. Não podem ser desativados." },
  { t: "Funcionais", d: "Lembram suas escolhas (idioma, tema, filtros) para personalizar a experiência." },
  { t: "Analíticos", d: "Ajudam a entender como os usuários navegam para que possamos melhorar a plataforma. Dados agregados e anônimos." },
  { t: "Marketing", d: "Permitem mostrar ofertas relevantes em outros sites. Só ativados com seu consentimento." },
];

export default function InvestirCookies() {
  return (
    <InstitutionalPage
      kicker="Cookies"
      title="Política de Cookies"
      subtitle="Como usamos cookies e como você pode gerenciar suas preferências."
      crumbs={[{ label: "Políticas", to: "/investir/politicas" }, { label: "Cookies" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl">
          <h2 className="text-xl md:text-2xl font-semibold text-carbon">O que são cookies</h2>
          <p className="mt-3 text-carbon/70 leading-relaxed">
            Cookies são pequenos arquivos armazenados no seu dispositivo quando você navega em sites.
            Eles ajudam a plataforma a funcionar corretamente e a entender como você a utiliza.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold text-carbon mt-10">Tipos de cookies que usamos</h2>
          <div className="mt-4 space-y-4">
            {tipos.map((t) => (
              <div key={t.t} className="p-5 rounded-xl border border-carbon/10 bg-white">
                <div className="font-semibold text-carbon">{t.t}</div>
                <p className="text-sm text-carbon/70 mt-2 leading-relaxed">{t.d}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-carbon mt-10">Como gerenciar</h2>
          <p className="mt-3 text-carbon/70 leading-relaxed">
            Você pode alterar suas preferências a qualquer momento limpando os cookies do seu navegador
            ou utilizando as configurações de privacidade do seu dispositivo. Note que desativar
            cookies essenciais pode impactar funcionalidades da plataforma.
          </p>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}

// Curadoria de fotos Unsplash para humanizar /investir.
// URLs determinísticas (sem download); todas livres para uso comercial.
// Sempre exibir disclaimer "fotos ilustrativas" no rodapé das páginas.

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const photos = {
  // Hero / pessoas
  heroEmpreendedora: u("1573497019940-1c28c88b4f3e", 1400), // mulher empreendedora
  heroJovemCelular: u("1556761175-5973dc0f32e7", 1200), // jovem usando celular
  heroFamilia: u("1511895426328-dc8714191300", 1200), // família planejando
  heroCasal: u("1521737604893-d14cc237f11d", 1200), // casal feliz

  // Personas
  personaIniciante: u("1494790108377-be9c29b29330", 800), // jovem investidor
  personaDiversifica: u("1560250097-0b93528c311a", 800), // executivo
  personaApoiador: u("1438761681033-6461ffad8d80", 800), // pessoa brasileira

  // Setores / empresas (fallback ofertas)
  padaria: u("1509440159596-0249088772ff", 800),
  oficina: u("1632823469850-2f77dd9c7f93", 800),
  industria: u("1581094794329-c8112a89af12", 800),
  varejo: u("1441986300917-64674bd600d8", 800),
  tech: u("1551434678-e076c223a692", 800),
  servicos: u("1521791136064-7986c2920216", 800),

  // Depoimentos
  depoimento1: u("1556157382-97eda2d62296", 600),
  depoimento2: u("1573496359142-b8d87734a5a2", 600),
  depoimento3: u("1560250097-0b93528c311a", 600),

  // Como funciona
  comoFunciona: u("1556742400-b5b7c5121f9e", 1200),
};

export const sectorPhoto = (sector?: string | null) => {
  const s = (sector || "").toLowerCase();
  if (s.includes("alimen") || s.includes("padar") || s.includes("food")) return photos.padaria;
  if (s.includes("ofic") || s.includes("auto")) return photos.oficina;
  if (s.includes("indus") || s.includes("manuf")) return photos.industria;
  if (s.includes("varej") || s.includes("retail") || s.includes("loja")) return photos.varejo;
  if (s.includes("tech") || s.includes("tecno") || s.includes("soft")) return photos.tech;
  return photos.servicos;
};

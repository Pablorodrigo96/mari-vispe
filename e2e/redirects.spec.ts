import { test, expect } from "@playwright/test";

/**
 * Validação dos redirects da reorganização do menu lateral do Equity Brain.
 *
 * Cada caso navega para a rota antiga e espera que o React Router redirecione
 * para a nova rota (preservando query params quando aplicável).
 *
 * Rotas gated por auth/admin: o teste valida apenas que a URL final bate com
 * o destino esperado (ou /auth?redirect=...). O conteúdo da página é
 * validado de forma best-effort (sidebar visível) e ignorado se a página
 * exigir login.
 */

type Redirect = {
  label: string;
  from: string;
  toPath: string;
  toQuery?: Record<string, string>;
  adminOnly?: boolean;
};

const REDIRECTS: Redirect[] = [
  { label: "index → executivo", from: "/equity-brain/", toPath: "/equity-brain/dashboards/executivo" },
  { label: "match-inbox → oportunidades", from: "/equity-brain/match-inbox", toPath: "/equity-brain/oportunidades" },
  { label: "crm → pipeline", from: "/equity-brain/crm", toPath: "/equity-brain/pipeline" },
  { label: "crm/minhas-empresas → pipeline?tab=empresas", from: "/equity-brain/crm/minhas-empresas", toPath: "/equity-brain/pipeline", toQuery: { tab: "empresas" } },
  { label: "mapa → pipeline?view=mapa", from: "/equity-brain/mapa", toPath: "/equity-brain/pipeline", toQuery: { view: "mapa" } },
  { label: "grafo → pipeline?view=grafo", from: "/equity-brain/grafo", toPath: "/equity-brain/pipeline", toQuery: { view: "grafo" } },
  { label: "crm/quick-fill → pipeline", from: "/equity-brain/crm/quick-fill", toPath: "/equity-brain/pipeline" },
  { label: "buyers → compradores", from: "/equity-brain/buyers", toPath: "/equity-brain/compradores" },
  { label: "teses → compradores?tab=teses", from: "/equity-brain/teses", toPath: "/equity-brain/compradores", toQuery: { tab: "teses" } },
  { label: "news → mercado", from: "/equity-brain/news", toPath: "/equity-brain/mercado" },
  { label: "board → dashboards/executivo", from: "/equity-brain/board", toPath: "/equity-brain/dashboards/executivo" },
  { label: "dashboard/executivo → dashboards/executivo", from: "/equity-brain/dashboard/executivo", toPath: "/equity-brain/dashboards/executivo" },
  { label: "dashboard/mandato → dashboards/mandatos", from: "/equity-brain/dashboard/mandato", toPath: "/equity-brain/dashboards/mandatos" },
  { label: "dashboard/match → dashboards/match", from: "/equity-brain/dashboard/match", toPath: "/equity-brain/dashboards/match" },
  { label: "dashboard/nbo → dashboards/propostas", from: "/equity-brain/dashboard/nbo", toPath: "/equity-brain/dashboards/propostas" },
  { label: "crm/imports → admin/imports", from: "/equity-brain/crm/imports", toPath: "/equity-brain/admin/imports", adminOnly: true },
  { label: "crm/admin/auditoria-operacional → admin/auditoria", from: "/equity-brain/crm/admin/auditoria-operacional", toPath: "/equity-brain/admin/auditoria", adminOnly: true },
  { label: "shadow → admin/shadow", from: "/equity-brain/shadow", toPath: "/equity-brain/admin/shadow", adminOnly: true },
  { label: "grafo-jarvis → admin/jarvis", from: "/equity-brain/grafo-jarvis", toPath: "/equity-brain/admin/jarvis", adminOnly: true },
];

for (const r of REDIRECTS) {
  test(`redirect: ${r.label}`, async ({ page, baseURL }) => {
    const fromUrl = new URL(r.from, baseURL).toString();
    await page.goto(fromUrl, { waitUntil: "domcontentloaded" });

    // Esperar React Router processar o <Navigate />.
    await page
      .waitForFunction(
        (start) => window.location.pathname !== start,
        new URL(fromUrl).pathname,
        { timeout: 10_000 },
      )
      .catch(() => {
        // Se a rota não estava sob /, ainda assim seguimos para checar URL final.
      });

    const finalUrl = new URL(page.url());

    // Caso o app exija login, a rota final pode ser /auth?redirect=...
    if (finalUrl.pathname.startsWith("/auth")) {
      const redirectParam = finalUrl.searchParams.get("redirect") ?? "";
      expect(
        redirectParam.startsWith(r.toPath),
        `Esperado redirect via /auth para ${r.toPath}, recebi ${redirectParam}`,
      ).toBeTruthy();
      test.info().annotations.push({ type: "skip-reason", description: "Auth wall — validado apenas o destino do redirect param." });
      return;
    }

    // Verifica path final.
    expect(finalUrl.pathname).toBe(r.toPath);

    // Verifica query params esperados (sem exigir exclusividade — outros params podem existir).
    if (r.toQuery) {
      for (const [k, v] of Object.entries(r.toQuery)) {
        expect(finalUrl.searchParams.get(k), `Param ?${k} esperado=${v}`).toBe(v);
      }
    }

    // Best-effort: o cockpit deve renderizar (sidebar com texto "Equity Brain").
    // Pulamos para rotas admin, pois usuário não-admin pode ver fallback de permissão.
    if (!r.adminOnly) {
      await expect(page.getByText("Equity Brain").first()).toBeVisible({ timeout: 8_000 });
    }
  });
}

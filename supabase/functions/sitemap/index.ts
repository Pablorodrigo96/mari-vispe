// Public sitemap.xml generator for mari.vispe.com.br
// Lists static routes + dynamic capital sector slugs + public listings
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://mari.vispe.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const staticRoutes = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/mari", priority: "0.95", changefreq: "daily" },
  { loc: "/marketplace", priority: "0.9", changefreq: "daily" },
  { loc: "/capital", priority: "0.9", changefreq: "weekly" },
  { loc: "/valuation", priority: "0.85", changefreq: "weekly" },
  { loc: "/vender", priority: "0.8", changefreq: "weekly" },
  { loc: "/investors", priority: "0.7", changefreq: "monthly" },
  { loc: "/auth", priority: "0.5", changefreq: "monthly" },
  { loc: "/terms", priority: "0.3", changefreq: "yearly" },
  { loc: "/reset-password", priority: "0.2", changefreq: "yearly" },
  { loc: "/payment-success", priority: "0.2", changefreq: "yearly" },
  { loc: "/aguardando-aprovacao", priority: "0.2", changefreq: "yearly" },
];

const capitalSectors = ["tech", "saude", "varejo", "industria"];

function urlEntry(loc: string, lastmod?: string, priority = "0.7", changefreq = "weekly") {
  return `  <url>
    <loc>${SITE_URL}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch public approved listings (cap 1000)
    const { data: listings } = await supabase
      .from("listings")
      .select("id, updated_at")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1000);

    const urls: string[] = [];
    for (const r of staticRoutes) urls.push(urlEntry(r.loc, undefined, r.priority, r.changefreq));
    for (const s of capitalSectors) urls.push(urlEntry(`/capital/setor/${s}`, undefined, "0.75", "weekly"));
    for (const l of listings ?? []) {
      const lastmod = l.updated_at ? new Date(l.updated_at).toISOString().slice(0, 10) : undefined;
      urls.push(urlEntry(`/marketplace/${l.id}`, lastmod, "0.6", "weekly"));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});


-- View: agregação por UF (choropleth nível Brasil)
CREATE OR REPLACE VIEW equity_brain.v_opportunities_by_uf AS
SELECT
  uf,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE ma_score >= 80)::int AS premium_count,
  COUNT(*) FILTER (WHERE ma_score >= 60 AND ma_score < 80)::int AS strong_count,
  ROUND(AVG(ma_score)::numeric, 1) AS avg_ma_score,
  (
    SELECT setor_ma
    FROM equity_brain.opportunities_ready o2
    WHERE o2.uf = o.uf AND o2.setor_ma IS NOT NULL
    GROUP BY setor_ma
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS top_setor
FROM equity_brain.opportunities_ready o
WHERE uf IS NOT NULL
GROUP BY uf;

-- View: agregação por município (clusters em zoom médio)
CREATE OR REPLACE VIEW equity_brain.v_opportunities_by_municipio AS
SELECT
  o.uf,
  o.municipio,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE o.ma_score >= 80)::int AS premium_count,
  ROUND(AVG(o.ma_score)::numeric, 1) AS avg_ma_score,
  AVG(c.latitude)  FILTER (WHERE c.latitude  IS NOT NULL) AS lat_centroid,
  AVG(c.longitude) FILTER (WHERE c.longitude IS NOT NULL) AS lng_centroid
FROM equity_brain.opportunities_ready o
LEFT JOIN equity_brain.companies c ON c.cnpj = o.cnpj
WHERE o.municipio IS NOT NULL AND o.uf IS NOT NULL
GROUP BY o.uf, o.municipio
HAVING AVG(c.latitude)  IS NOT NULL
   AND AVG(c.longitude) IS NOT NULL;

GRANT SELECT ON equity_brain.v_opportunities_by_uf        TO authenticated;
GRANT SELECT ON equity_brain.v_opportunities_by_municipio TO authenticated;

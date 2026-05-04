
create table if not exists public.sector_market_trends (
  segment text not null,
  ano int not null,
  num_deals int not null,
  volume_m numeric not null,
  tendencia text not null check (tendencia in ('historical','estimated','projection')),
  primary key (segment, ano)
);

alter table public.sector_market_trends enable row level security;

drop policy if exists "Anyone can read sector trends" on public.sector_market_trends;
create policy "Anyone can read sector trends"
  on public.sector_market_trends for select using (true);

drop policy if exists "Admins manage sector trends" on public.sector_market_trends;
create policy "Admins manage sector trends"
  on public.sector_market_trends for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

insert into public.sector_market_trends (segment, ano, num_deals, volume_m, tendencia) values
  ('Varejo',2022,42,1800,'historical'),('Varejo',2023,55,2400,'historical'),('Varejo',2024,68,3100,'historical'),('Varejo',2025,82,3900,'estimated'),('Varejo',2026,98,4800,'projection'),('Varejo',2027,118,6200,'projection'),('Varejo',2028,105,5500,'projection'),
  ('Indústria',2022,28,2200,'historical'),('Indústria',2023,34,2800,'historical'),('Indústria',2024,41,3500,'historical'),('Indústria',2025,52,4400,'estimated'),('Indústria',2026,65,5600,'projection'),('Indústria',2027,78,7100,'projection'),('Indústria',2028,71,6500,'projection'),
  ('Serviços',2022,38,1500,'historical'),('Serviços',2023,46,1900,'historical'),('Serviços',2024,58,2500,'historical'),('Serviços',2025,72,3200,'estimated'),('Serviços',2026,88,4100,'projection'),('Serviços',2027,105,5200,'projection'),('Serviços',2028,95,4700,'projection'),
  ('Tecnologia',2022,18,1100,'historical'),('Tecnologia',2023,26,1800,'historical'),('Tecnologia',2024,38,2900,'historical'),('Tecnologia',2025,55,4200,'estimated'),('Tecnologia',2026,78,6100,'projection'),('Tecnologia',2027,98,8400,'projection'),('Tecnologia',2028,88,7600,'projection'),
  ('Saúde',2022,22,1400,'historical'),('Saúde',2023,29,1900,'historical'),('Saúde',2024,38,2600,'historical'),('Saúde',2025,49,3500,'estimated'),('Saúde',2026,62,4600,'projection'),('Saúde',2027,76,5900,'projection'),('Saúde',2028,68,5300,'projection'),
  ('Agronegócio',2022,15,2100,'historical'),('Agronegócio',2023,19,2700,'historical'),('Agronegócio',2024,25,3500,'historical'),('Agronegócio',2025,33,4500,'estimated'),('Agronegócio',2026,42,5800,'projection'),('Agronegócio',2027,52,7200,'projection'),('Agronegócio',2028,46,6500,'projection'),
  ('Construção',2022,16,1300,'historical'),('Construção',2023,21,1700,'historical'),('Construção',2024,27,2200,'historical'),('Construção',2025,34,2900,'estimated'),('Construção',2026,43,3700,'projection'),('Construção',2027,52,4600,'projection'),('Construção',2028,46,4100,'projection'),
  ('Telecom',2022,8,650,'historical'),('Telecom',2023,12,950,'historical'),('Telecom',2024,18,1500,'historical'),('Telecom',2025,26,2300,'estimated'),('Telecom',2026,36,3400,'projection'),('Telecom',2027,46,4500,'projection'),('Telecom',2028,40,4000,'projection'),
  ('Outros',2022,30,1500,'historical'),('Outros',2023,38,2000,'historical'),('Outros',2024,48,2700,'historical'),('Outros',2025,60,3500,'estimated'),('Outros',2026,75,4500,'projection'),('Outros',2027,90,5700,'projection'),('Outros',2028,80,5100,'projection')
on conflict (segment, ano) do nothing;

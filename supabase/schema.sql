-- =====================================================================
--  VELLURE · Maison de Lingerie — Banco de dados Supabase
--  Cole este arquivo inteiro no SQL Editor do projeto e clique em RUN.
--  Pode ser executado mais de uma vez (idempotente).
-- =====================================================================

-- E-mail(s) que viram administradores automaticamente ao se cadastrar
create or replace function public.admin_emails() returns text[]
language sql immutable as $$ select array['haydenfernandes.ti@gmail.com']::text[] $$;

-- ---------------------------------------------------------------------
--  PERFIS
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  cpf text,
  birth_date date,
  role text not null default 'customer' check (role in ('customer','admin')),
  measurements jsonb default '{}'::jsonb,   -- {busto, sobBusto, cintura, quadril, sutia, calcinha}
  petals int not null default 0,            -- programa de pontos "Pétalas"
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce(new.raw_user_meta_data->>'phone',''),
          case when lower(new.email) = any(public.admin_emails()) then 'admin' else 'customer' end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Cria perfis para usuários que já existiam antes deste script
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name',''),
       case when lower(u.email) = any(public.admin_emails()) then 'admin' else 'customer' end
from auth.users u on conflict (id) do nothing;

-- Impede que clientes promovam a si mesmos
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.is_admin() then new.role := old.role; end if;
  if new.petals <> old.petals and not public.is_admin() and current_setting('vellure.internal', true) is distinct from '1' then
    new.petals := old.petals;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
for each row execute function public.protect_role();

-- ---------------------------------------------------------------------
--  CATÁLOGO
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  slug text primary key,
  name text not null,
  description text,
  sort int default 0
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text,
  description text,
  category text references public.categories(slug) on update cascade,
  price numeric(10,2) not null,
  compare_price numeric(10,2),
  colors jsonb default '[]'::jsonb,        -- [{name, hex}]
  sizes text[] default '{}',
  stock int not null default 0,
  images text[] default '{}',              -- URLs de fotos (Storage)
  art jsonb default '{}'::jsonb,           -- ilustração editorial gerada {style,color,accent,skin,bg}
  material text,
  care text,
  is_featured boolean default false,
  is_new boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.wishlist (
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------
--  ENDEREÇOS / FRETE
-- ---------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text default 'Casa',
  recipient text,
  cep text, street text, number text, complement text,
  district text, city text, state text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.shipping_rates (
  uf text primary key,
  region text,
  classic_price numeric(10,2), classic_days int,
  express_price numeric(10,2), express_days int
);

create table if not exists public.delivery_districts (
  id serial primary key,
  city text default 'São Paulo',
  name text not null unique,
  x int, y int,                 -- posição no mapa ilustrado (0–1000 x 0–700)
  fee numeric(10,2) not null,
  eta_minutes int not null,
  same_day boolean default true,
  note text
);

-- ---------------------------------------------------------------------
--  CUPONS
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  code text primary key,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(10,2) not null,
  min_total numeric(10,2) default 0,
  active boolean default true,
  expires_at timestamptz,
  uses int default 0
);

-- ---------------------------------------------------------------------
--  PEDIDOS
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','em_atelier','enviado','entregue','cancelado')),
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon text,
  payment_method text,
  shipping_method text,
  address jsonb,
  gift jsonb,
  tracking text,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text, size text, color text,
  qty int not null, unit_price numeric(10,2) not null
);

-- ---------------------------------------------------------------------
--  RECORRÊNCIA: planos (Box Misteriosa, Cercle Privé, Lingerie Care)
-- ---------------------------------------------------------------------
create table if not exists public.plans (
  slug text primary key,
  kind text not null check (kind in ('box','cercle','care')),
  name text not null,
  tagline text,
  price numeric(10,2) not null,
  perks jsonb default '[]'::jsonb,
  highlight boolean default false,
  sort int default 0,
  active boolean default true
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_slug text references public.plans(slug),
  status text not null default 'ativa' check (status in ('ativa','pausada','cancelada')),
  preferences jsonb default '{}'::jsonb,
  next_billing date default (current_date + interval '1 month'),
  started_at timestamptz default now()
);

create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  month date not null,
  theme text,
  items jsonb default '[]'::jsonb,
  status text default 'curadoria' check (status in ('curadoria','preparando','enviada','entregue')),
  tracking text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
--  CONCIERGE (Cercle Privé)
-- ---------------------------------------------------------------------
create table if not exists public.services (
  slug text primary key,
  name text not null,
  description text,
  duration text,
  price numeric(10,2) default 0,
  member_price numeric(10,2) default 0,
  icon text,
  sort int default 0
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  service_slug text references public.services(slug),
  date date not null,
  time text not null,
  mode text default 'domicilio',
  address text,
  notes text,
  status text default 'solicitado' check (status in ('solicitado','confirmado','concluido','cancelado')),
  created_at timestamptz default now()
);

create table if not exists public.newsletter (
  email text primary key,
  created_at timestamptz default now()
);

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.newsletter enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.wishlist enable row level security;
alter table public.addresses enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.delivery_districts enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.boxes enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

do $$
declare t text;
begin
  -- limpa políticas antigas para reexecução
  for t in select format('drop policy if exists %I on %I.%I', policyname, schemaname, tablename)
           from pg_policies where schemaname = 'public' loop
    execute t;
  end loop;
end $$;

-- leitura pública do catálogo
create policy "public read" on public.categories for select using (true);
create policy "public read" on public.products for select using (is_active or public.is_admin());
create policy "public read" on public.shipping_rates for select using (true);
create policy "public read" on public.delivery_districts for select using (true);
create policy "public read" on public.plans for select using (active or public.is_admin());
create policy "public read" on public.services for select using (true);

create policy "anyone subscribes" on public.newsletter for insert with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
create policy "admin all" on public.newsletter for all using (public.is_admin()) with check (public.is_admin());

-- admin gerencia tudo
create policy "admin all" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.shipping_rates for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.delivery_districts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.plans for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.boxes for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.appointments for all using (public.is_admin()) with check (public.is_admin());
create policy "admin read" on public.profiles for select using (public.is_admin());
create policy "admin update" on public.profiles for update using (public.is_admin());

-- cliente: seus próprios dados
create policy "own profile read" on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());
create policy "own wishlist" on public.wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own orders" on public.orders for select using (user_id = auth.uid());
create policy "own order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own subs read" on public.subscriptions for select using (user_id = auth.uid());
create policy "own subs update" on public.subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own boxes" on public.boxes for select
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid()));
create policy "own appointments" on public.appointments for select using (user_id = auth.uid());
create policy "own appointments insert" on public.appointments for insert with check (user_id = auth.uid());
create policy "own appointments cancel" on public.appointments for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
--  FUNÇÕES (RPC) — preços sempre calculados no servidor
-- =====================================================================
create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.coupons; d numeric := 0;
begin
  select * into c from public.coupons where upper(code) = upper(trim(p_code)) and active
     and (expires_at is null or expires_at > now());
  if not found then return jsonb_build_object('ok', false, 'message', 'Cupom inválido ou expirado'); end if;
  if p_subtotal < coalesce(c.min_total,0) then
    return jsonb_build_object('ok', false, 'message', 'Válido para compras acima de R$ ' || c.min_total);
  end if;
  d := case when c.kind = 'percent' then round(p_subtotal * c.value / 100, 2) else least(c.value, p_subtotal) end;
  return jsonb_build_object('ok', true, 'code', c.code, 'discount', d, 'kind', c.kind, 'value', c.value);
end $$;

create or replace function public.place_order(
  p_items jsonb, p_address jsonb, p_shipping jsonb, p_payment text, p_coupon text default null, p_gift jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it jsonb; pr public.products;
  v_sub numeric := 0; v_disc numeric := 0; v_ship numeric := coalesce((p_shipping->>'price')::numeric, 0);
  v_total numeric; v_order uuid; v_code text; cp jsonb;
begin
  if uid is null then raise exception 'Faça login para finalizar'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Sacola vazia'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from public.products where slug = it->>'slug' and is_active;
    if not found then raise exception 'Produto indisponível: %', it->>'slug'; end if;
    v_sub := v_sub + pr.price * greatest(1, (it->>'qty')::int);
  end loop;

  if v_ship < 0 or v_ship > 300 then v_ship := 0; end if;
  if v_sub >= 1500 then v_ship := 0; end if;                 -- frete cortesia
  if exists (select 1 from public.subscriptions s join public.plans p on p.slug = s.plan_slug
             where s.user_id = uid and s.status = 'ativa' and (p.kind = 'cercle' or p.slug = 'haute-couture'))
  then v_ship := 0; end if;                                   -- membros Cercle: frete grátis

  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    cp := public.check_coupon(p_coupon, v_sub);
    if (cp->>'ok')::boolean then v_disc := (cp->>'discount')::numeric;
      update public.coupons set uses = uses + 1 where code = cp->>'code';
    end if;
  end if;

  if p_payment = 'pix' then v_disc := v_disc + round((v_sub - v_disc) * 0.05, 2); end if; -- 5% off no Pix
  v_total := greatest(0, v_sub - v_disc + v_ship);
  v_code := 'VL' || to_char(now(), 'YYMM') || '-' || upper(substr(md5(random()::text), 1, 5));

  insert into public.orders (code, user_id, subtotal, shipping, discount, total, coupon, payment_method,
                             shipping_method, address, gift)
  values (v_code, uid, v_sub, v_ship, v_disc, v_total, nullif(upper(trim(p_coupon)),''), p_payment,
          p_shipping->>'label', p_address, p_gift)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from public.products where slug = it->>'slug';
    insert into public.order_items (order_id, product_id, name, size, color, qty, unit_price)
    values (v_order, pr.id, pr.name, it->>'size', it->>'color', greatest(1,(it->>'qty')::int), pr.price);
    update public.products set stock = greatest(0, stock - greatest(1,(it->>'qty')::int)) where id = pr.id;
  end loop;

  perform set_config('vellure.internal', '1', true);
  update public.profiles set petals = petals + floor(v_total)::int where id = uid;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total, 'shipping', v_ship, 'discount', v_disc);
end $$;

create or replace function public.subscribe_plan(p_plan text, p_preferences jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pl public.plans; sid uuid;
begin
  if uid is null then raise exception 'Faça login para assinar'; end if;
  select * into pl from public.plans where slug = p_plan and active;
  if not found then raise exception 'Plano indisponível'; end if;
  -- uma assinatura ativa por tipo de plano
  update public.subscriptions s set status = 'cancelada'
   from public.plans p where p.slug = s.plan_slug and p.kind = pl.kind and s.user_id = uid and s.status <> 'cancelada';
  insert into public.subscriptions (user_id, plan_slug, preferences)
  values (uid, p_plan, coalesce(p_preferences, '{}'::jsonb)) returning id into sid;
  if pl.kind = 'box' then
    insert into public.boxes (subscription_id, month, theme)
    values (sid, date_trunc('month', current_date + interval '1 month')::date, 'Primeira caixa · Boas-vindas à Maison');
  end if;
  return jsonb_build_object('id', sid, 'plan', pl.name);
end $$;

grant execute on function public.check_coupon(text, numeric) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, text, jsonb) to authenticated;
grant execute on function public.subscribe_plan(text, jsonb) to authenticated;

-- =====================================================================
--  STORAGE — fotos de produtos
-- =====================================================================
insert into storage.buckets (id, name, public) values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "vellure public read" on storage.objects;
drop policy if exists "vellure admin write" on storage.objects;
drop policy if exists "vellure admin update" on storage.objects;
drop policy if exists "vellure admin delete" on storage.objects;
create policy "vellure public read" on storage.objects for select using (bucket_id = 'products');
create policy "vellure admin write" on storage.objects for insert with check (bucket_id = 'products' and public.is_admin());
create policy "vellure admin update" on storage.objects for update using (bucket_id = 'products' and public.is_admin());
create policy "vellure admin delete" on storage.objects for delete using (bucket_id = 'products' and public.is_admin());

-- =====================================================================
--  DADOS INICIAIS
-- =====================================================================
insert into public.categories (slug, name, description, sort) values
 ('conjuntos','Conjuntos','Sutiã e calcinha desenhados para existirem juntos',1),
 ('sutias','Sutiãs','Sustentação esculpida, renda que respira',2),
 ('calcinhas','Calcinhas','Do fio ao cintura alta, sempre em seda e renda',3),
 ('bodies','Bodies','Uma única linha, do colo ao quadril',4),
 ('noite','Noite & Robes','Camisolas e robes em seda pura',5),
 ('cintas-ligas','Cintas-ligas','O ritual mais antigo da sedução',6),
 ('noiva','Noiva','Enxoval branco, bordado à mão',7)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort = excluded.sort;

insert into public.products (slug,name,subtitle,description,category,price,compare_price,colors,sizes,stock,art,material,care,is_featured,is_new) values
('conjunto-nocturne','Conjunto Nocturne','Renda Chantilly · Preto ônix','Renda Chantilly de Calais sobre tule de seda, bordas em festonê e fecho banhado a ouro 18k. A peça-assinatura da Maison.','conjuntos',689,null,'[{"name":"Ônix","hex":"#141014"},{"name":"Vinho","hex":"#5c1325"}]','{38,40,42,44,46,48}',24,'{"style":"set","color":"#141014","accent":"#c9a46a","skin":2,"bg":"blush"}','Renda Chantilly, tule de seda, aro forrado','Lavar à mão em água fria com sabão neutro',true,false),
('conjunto-aurora','Conjunto Aurora','Cetim de seda · Champagne','Cetim de seda com toque líquido e brilho perolado. Bojo modelado sem costuras, calcinha de recorte alto.','conjuntos',749,null,'[{"name":"Champagne","hex":"#e8cfae"},{"name":"Pérola","hex":"#f4ede4"}]','{38,40,42,44,46}',18,'{"style":"set","color":"#e8cfae","accent":"#b8925a","skin":4,"bg":"noir"}','Cetim de seda 19 momme','Lavar à mão, secar à sombra',true,true),
('body-vesper','Body Vesper','Tule bordado · Bordeaux','Body de tule com bordado floral contínuo, decote profundo e cavas altas que alongam a silhueta.','bodies',890,990,'[{"name":"Bordeaux","hex":"#5c1325"},{"name":"Ônix","hex":"#141014"}]','{P,M,G,GG}',12,'{"style":"bodysuit","color":"#5c1325","accent":"#d4af7a","skin":1,"bg":"champagne"}','Tule bordado, elastano','Lavar à mão',true,false),
('sutia-camelia','Sutiã Camélia','Renda francesa · Rosé','Sutiã balconette em renda francesa leavers, com alças reguláveis forradas em cetim.','sutias',389,null,'[{"name":"Rosé","hex":"#d9a3a6"},{"name":"Marfim","hex":"#efe6da"}]','{38,40,42,44,46,48,50}',30,'{"style":"bralette","color":"#d9a3a6","accent":"#a8737a","skin":3,"bg":"ivory"}','Renda leavers francesa','Lavar à mão',false,true),
('calcinha-camelia','Calcinha Camélia','Renda francesa · Rosé','Calcinha tanga de renda leavers com fundo em algodão egípcio. Combina com o Sutiã Camélia.','calcinhas',189,null,'[{"name":"Rosé","hex":"#d9a3a6"},{"name":"Marfim","hex":"#efe6da"}]','{PP,P,M,G,GG}',40,'{"style":"bralette","color":"#d9a3a6","accent":"#a8737a","skin":5,"bg":"blush"}','Renda leavers, forro algodão egípcio','Lavar à mão',false,false),
('cinta-liga-belle-epoque','Cinta-liga Belle Époque','Seda & renda · Noir','Cinta-liga de cintura alta com seis presilhas em metal dourado e laço de veludo.','cintas-ligas',459,null,'[{"name":"Noir","hex":"#0f0f12"}]','{P,M,G,GG}',15,'{"style":"garter","color":"#0f0f12","accent":"#c9a46a","skin":5,"bg":"wine"}','Seda, renda Chantilly, veludo','Lavar à mão',true,false),
('robe-lune','Robe Lune','Seda pura · Marfim','Robe longo em seda pura charmeuse com mangas quimono e faixa removível. Acompanha saquinho de cetim.','noite',1190,null,'[{"name":"Marfim","hex":"#f3ece2"},{"name":"Noir","hex":"#151216"}]','{P,M,G}',9,'{"style":"robe","color":"#f3ece2","accent":"#c9a46a","skin":0,"bg":"noir","under":"#e8cfae"}','Seda charmeuse 22 momme','Lavagem a seco ou à mão',true,true),
('camisola-mirage','Camisola Mirage','Seda · Azul névoa','Camisola slip em viés, alças finas cruzadas nas costas e barra com renda.','noite',980,null,'[{"name":"Azul névoa","hex":"#8a9bb0"},{"name":"Champagne","hex":"#e8cfae"}]','{P,M,G,GG}',14,'{"style":"slip","color":"#8a9bb0","accent":"#e8e2d6","skin":3,"bg":"ivory"}','Seda em viés','Lavar à mão',false,true),
('conjunto-blanc-de-noces','Blanc de Noces','Coleção Noiva · Branco','Conjunto com cinta-liga em renda guipir e pérolas de água doce. Bordamos as iniciais do casal sob encomenda.','noiva',920,null,'[{"name":"Branco","hex":"#f7f3ee"}]','{38,40,42,44,46}',8,'{"style":"garter","color":"#f7f3ee","accent":"#d8c3a5","skin":2,"bg":"champagne"}','Renda guipir, pérolas','Lavar à mão',true,false),
('body-onyx','Body Onyx','Tule transparente · Preto','Body em tule de alta transparência com tiras gráficas e fecho em gancho dourado.','bodies',790,null,'[{"name":"Preto","hex":"#1b1b1f"}]','{P,M,G,GG}',11,'{"style":"bodysuit","color":"#1b1b1f","accent":"#c9a46a","skin":4,"bg":"blush"}','Tule, elastano','Lavar à mão',false,false),
('conjunto-emeraude','Conjunto Émeraude','Veludo & renda · Esmeralda','Veludo de seda verde-esmeralda com renda tom sobre tom. Edição limitada de inverno.','conjuntos',720,null,'[{"name":"Esmeralda","hex":"#1f4d3f"}]','{38,40,42,44,46}',10,'{"style":"set","color":"#1f4d3f","accent":"#c9a46a","skin":0,"bg":"champagne"}','Veludo de seda, renda','Lavar à mão',false,true),
('bralette-petale','Bralette Pétale','Renda sem aro · Blush','Bralette sem aro e sem bojo, renda macia com acabamento em festonê. Conforto absoluto.','sutias',329,null,'[{"name":"Blush","hex":"#f0c9c0"},{"name":"Ônix","hex":"#141014"}]','{P,M,G,GG}',26,'{"style":"bralette","color":"#f0c9c0","accent":"#c48b80","skin":5,"bg":"ivory"}','Renda elástica','Lavar à mão',false,false),
('calcinha-hauteville','Calcinha Hauteville','Cintura alta · Cacau','Calcinha de cintura alta em microfibra italiana com painel de renda, modela sem marcar.','calcinhas',249,null,'[{"name":"Cacau","hex":"#4a2e2a"},{"name":"Ônix","hex":"#141014"}]','{PP,P,M,G,GG,XG}',35,'{"style":"highwaist","color":"#4a2e2a","accent":"#c9a46a","skin":1,"bg":"blush"}','Microfibra italiana, renda','Lavar à mão',false,false),
('conjunto-saphir','Conjunto Saphir','Renda bordada · Cobalto','Renda bordada com fio metalizado em azul cobalto profundo. Sutiã plunge com bojo leve.','conjuntos',690,null,'[{"name":"Cobalto","hex":"#1d2f6b"}]','{38,40,42,44,46,48}',16,'{"style":"set","color":"#1d2f6b","accent":"#d4af7a","skin":3,"bg":"blush"}','Renda bordada','Lavar à mão',true,false),
('camisola-nuit-blanche','Camisola Nuit Blanche','Seda · Pérola','Camisola em seda pérola com decote em renda Chantilly e fenda lateral.','noite',860,null,'[{"name":"Pérola","hex":"#efe6da"}]','{P,M,G,GG}',12,'{"style":"slip","color":"#efe6da","accent":"#c9a46a","skin":4,"bg":"wine"}','Seda, renda Chantilly','Lavar à mão',false,false),
('conjunto-rubis','Conjunto Rubis','Tule & veludo · Rubi','Tule bordado com aplicações de veludo, cor rubi intensa. Calcinha com laterais em tiras.','conjuntos',710,790,'[{"name":"Rubi","hex":"#8e1b2c"}]','{38,40,42,44,46}',13,'{"style":"set","color":"#8e1b2c","accent":"#d4af7a","skin":1,"bg":"ivory"}','Tule, veludo','Lavar à mão',false,false)
on conflict (slug) do nothing;

insert into public.plans (slug, kind, name, tagline, price, perks, highlight, sort) values
('essentielle','box','Essentielle','Uma peça-surpresa por mês',189,
 '["1 peça surpresa (sutiã, calcinha ou bralette)","Curadoria pelo seu perfil e medidas","Caixa-presente perfumada","Troca de tamanho grátis"]',false,1),
('signature','box','Signature','O conjunto completo, todo mês',349,
 '["Conjunto completo surpresa","Sachê perfumado exclusivo","Bilhete escrito à mão","Troca grátis e 2× Pétalas","Acesso antecipado às coleções"]',true,2),
('haute-couture','box','Haute Couture','A experiência integral da Maison',649,
 '["Conjunto premium + peça extra (body, robe ou cinta-liga)","Inclui Cercle Privé (frete grátis sempre)","Prova em Casa ilimitada","Presente de aniversário","3× Pétalas"]',false,3),
('cercle-prive','cercle','Cercle Privé','Clube de membros da Maison',99,
 '["Frete grátis em todas as compras","Prova em Casa com mensageira","Pré-venda 48h antes de todas","Personal stylist por vídeo","Presente no aniversário"]',true,4),
('lingerie-care','care','Lingerie Care','Lavanderia delicada mensal',129,
 '["Coleta e devolução em casa","Lavagem à mão com sabão de seda","Restauração de alças e fechos","Devolução em sachê perfumado"]',false,5)
on conflict (slug) do update set name=excluded.name, tagline=excluded.tagline, price=excluded.price, perks=excluded.perks, highlight=excluded.highlight;

insert into public.services (slug,name,description,duration,price,member_price,icon,sort) values
('prova-em-casa','Prova em Casa','Uma mensageira Vellure leva até 8 peças selecionadas para você. Prove com calma e fique apenas com o que amar.','90 min',120,0,'home',1),
('stylist-video','Personal Stylist por Vídeo','Uma consultora confirma suas medidas e monta seu guarda-roupa íntimo ideal.','45 min',90,0,'video',2),
('gift-concierge','Gift Concierge','Para presentear: curadoria, cartão caligrafado e entrega na hora marcada, com discrição absoluta.','—',60,0,'gift',3),
('atelier-noiva','Atelier Noiva','Enxoval completo da noiva com bordado de iniciais e prova no atelier dos Jardins.','2 h',0,0,'ring',4),
('monograma','Monograma Bordado','Suas iniciais bordadas à mão em fio de seda em qualquer peça da Maison.','7 dias',150,90,'needle',5)
on conflict (slug) do update set name=excluded.name, description=excluded.description;

insert into public.coupons (code, kind, value, min_total) values
('BIENVENUE10','percent',10,0),
('MAISON150','fixed',150,1200)
on conflict (code) do nothing;

insert into public.shipping_rates (uf,region,classic_price,classic_days,express_price,express_days) values
('SP','Sudeste',29.9,3,49.9,1),('RJ','Sudeste',34.9,4,59.9,2),('MG','Sudeste',34.9,4,59.9,2),('ES','Sudeste',39.9,5,64.9,2),
('PR','Sul',39.9,5,64.9,2),('SC','Sul',42.9,5,69.9,3),('RS','Sul',44.9,6,72.9,3),
('DF','Centro-Oeste',44.9,5,72.9,2),('GO','Centro-Oeste',44.9,6,72.9,3),('MT','Centro-Oeste',52.9,7,84.9,3),('MS','Centro-Oeste',49.9,6,79.9,3),
('BA','Nordeste',49.9,7,79.9,3),('PE','Nordeste',52.9,7,84.9,3),('CE','Nordeste',54.9,8,86.9,3),('RN','Nordeste',54.9,8,86.9,4),('PB','Nordeste',54.9,8,86.9,4),
('AL','Nordeste',54.9,8,86.9,4),('SE','Nordeste',52.9,8,84.9,4),('MA','Nordeste',59.9,9,94.9,4),('PI','Nordeste',59.9,9,94.9,4),
('PA','Norte',64.9,10,99.9,5),('AM','Norte',69.9,11,109.9,5),('AP','Norte',69.9,12,109.9,6),('RR','Norte',72.9,12,114.9,6),
('RO','Norte',64.9,10,99.9,5),('AC','Norte',72.9,12,114.9,6),('TO','Norte',59.9,9,94.9,4)
on conflict (uf) do nothing;

insert into public.delivery_districts (name,x,y,fee,eta_minutes,same_day,note) values
('Jardins',470,385,0,40,true,'Nosso atelier fica aqui · retirada com champagne'),
('Cerqueira César',400,348,0,45,true,null),
('Higienópolis',480,290,19.9,60,true,null),
('Pacaembu',375,292,19.9,65,true,null),
('Perdizes',345,250,24.9,75,true,null),
('Vila Madalena',300,330,24.9,75,true,null),
('Pinheiros',355,385,19.9,60,true,null),
('Itaim Bibi',420,455,19.9,55,true,null),
('Vila Nova Conceição',485,470,19.9,55,true,null),
('Vila Mariana',570,420,24.9,70,true,null),
('Aclimação',600,350,24.9,75,true,null),
('Moema',540,525,24.9,70,true,null),
('Brooklin',450,565,29.9,85,true,null),
('Campo Belo',520,605,29.9,90,true,null),
('Cidade Jardim',335,465,24.9,70,true,null),
('Morumbi',245,505,34.9,100,true,null),
('Butantã',205,390,34.9,100,true,null),
('Santana',530,120,39.9,120,true,null),
('Tatuapé',770,255,39.9,120,true,null),
('Mooca',690,335,34.9,105,true,null),
('Anália Franco',830,355,44.9,130,true,null),
('Alphaville',70,255,59.9,150,true,'Entrega com hora marcada')
on conflict (name) do nothing;

-- Promover um usuário já cadastrado a administrador (se necessário):
-- update public.profiles set role = 'admin' where email = 'seu@email.com';

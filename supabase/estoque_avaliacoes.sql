-- =====================================================================
--  VELLURE · Estoque por tamanho, "Avise-me quando chegar" e Avaliações com foto
--  Rode depois de schema.sql, produtos_reais.sql e assinatura_vip.sql.
--  Pode rodar de novo sem problema (idempotente).
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. ESTOQUE POR TAMANHO
--     products.stock_by_size = {"P": 3, "M": 0, "G": 2}
--     Tamanho fora do objeto = sem controle (segue o estoque total).
--     products.stock vira a soma automática dos tamanhos.
-- ---------------------------------------------------------------------
alter table public.products add column if not exists stock_by_size jsonb not null default '{}'::jsonb;

-- reparte o estoque atual entre os tamanhos (só nos produtos que ainda não têm a grade)
update public.products p set stock_by_size = (
  select coalesce(jsonb_object_agg(s.size, (p.stock / n.cnt) + case when s.i <= (p.stock % n.cnt) then 1 else 0 end), '{}'::jsonb)
  from unnest(p.sizes) with ordinality as s(size, i), (select greatest(1, cardinality(p.sizes)) as cnt) n
)
where p.stock_by_size = '{}'::jsonb and cardinality(p.sizes) > 0;

create or replace function public.sync_stock_total() returns trigger
language plpgsql as $$
begin
  if new.stock_by_size is null then new.stock_by_size := '{}'::jsonb; end if;
  if new.stock_by_size <> '{}'::jsonb then
    new.stock := (select coalesce(sum(greatest(0, (v #>> '{}')::int)), 0) from jsonb_each(new.stock_by_size) as e(k, v));
  end if;
  return new;
end $$;
drop trigger if exists products_stock_total on public.products;
create trigger products_stock_total before insert or update of stock_by_size, stock on public.products
  for each row execute function public.sync_stock_total();

-- ---------------------------------------------------------------------
--  2. AVISE-ME QUANDO CHEGAR
-- ---------------------------------------------------------------------
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  size text not null,
  email text,
  phone text,
  user_id uuid references auth.users(id) on delete set null,
  ready_at timestamptz,          -- quando o tamanho voltou ao estoque
  notified_at timestamptz,       -- quando a Maison avisou a cliente
  created_at timestamptz default now(),
  constraint stock_alerts_contact check (coalesce(email, phone) is not null)
);
create unique index if not exists stock_alerts_uniq on public.stock_alerts (product_slug, size, lower(coalesce(email, '')), coalesce(phone, ''))
  where notified_at is null;
alter table public.stock_alerts enable row level security;
drop policy if exists "admin all" on public.stock_alerts;
drop policy if exists "own read" on public.stock_alerts;
create policy "admin all" on public.stock_alerts for all using (public.is_admin()) with check (public.is_admin());
create policy "own read" on public.stock_alerts for select using (user_id = auth.uid());

-- a loja grava o pedido de aviso por esta função (anônimas também podem)
create or replace function public.stock_alert(p_slug text, p_size text, p_email text default null, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := nullif(lower(trim(p_email)), ''); v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
begin
  if v_email is null and v_phone is null then raise exception 'Informe e-mail ou WhatsApp'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if v_phone is not null and length(v_phone) not between 10 and 13 then raise exception 'WhatsApp inválido'; end if;
  if not exists (select 1 from public.products where slug = p_slug and is_active and p_size = any(sizes)) then
    raise exception 'Peça ou tamanho indisponível';
  end if;
  insert into public.stock_alerts (product_slug, size, email, phone, user_id)
  values (p_slug, p_size, v_email, v_phone, auth.uid())
  on conflict do nothing;
  return jsonb_build_object('ok', true, 'waiting',
    (select count(*) from public.stock_alerts where product_slug = p_slug and size = p_size and notified_at is null));
end $$;
grant execute on function public.stock_alert(text, text, text, text) to anon, authenticated;

-- quando um tamanho volta (0 → maior que 0), os avisos ficam "prontos" para a Maison enviar
create or replace function public.mark_alerts_ready() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb;
begin
  for k, v in select * from jsonb_each(new.stock_by_size) loop
    if (v #>> '{}')::int > 0 and coalesce((old.stock_by_size ->> k)::int, 0) <= 0 then
      update public.stock_alerts set ready_at = now()
       where product_slug = new.slug and size = k and notified_at is null and ready_at is null;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists products_alerts_ready on public.products;
create trigger products_alerts_ready after update of stock_by_size on public.products
  for each row execute function public.mark_alerts_ready();

-- ---------------------------------------------------------------------
--  3. AVALIAÇÕES COM FOTO (só de quem comprou a peça)
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  author_name text,
  rating int not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1500),
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  size_bought text,
  fit text check (fit in ('pequeno', 'perfeito', 'grande')),
  verified boolean not null default false,
  approved boolean not null default false,
  reply text,
  created_at timestamptz default now(),
  unique (user_id, product_slug)
);
alter table public.reviews enable row level security;
drop policy if exists "public read approved" on public.reviews;
drop policy if exists "own insert" on public.reviews;
drop policy if exists "own update" on public.reviews;
drop policy if exists "own delete" on public.reviews;
drop policy if exists "admin all" on public.reviews;
create policy "public read approved" on public.reviews for select using (approved or user_id = auth.uid() or public.is_admin());
create policy "own insert" on public.reviews for insert with check (user_id = auth.uid());
create policy "own update" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own delete" on public.reviews for delete using (user_id = auth.uid());
create policy "admin all" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- confere a compra, assina com o primeiro nome + inicial e manda para moderação
create or replace function public.review_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if public.is_admin() and tg_op = 'UPDATE' then return new; end if;  -- moderação e resposta da Maison
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'Entre na sua conta para avaliar'; end if;
  if not exists (
    select 1 from public.orders o join public.order_items i on i.order_id = o.id join public.products p on p.id = i.product_id
     where o.user_id = new.user_id and p.slug = new.product_slug and o.status in ('pago', 'em_atelier', 'enviado', 'entregue')
  ) then raise exception 'Só quem comprou esta peça pode avaliar'; end if;
  select full_name into v_name from public.profiles where id = new.user_id;
  v_name := trim(coalesce(v_name, ''));
  new.author_name := case when v_name = '' then 'Cliente Vellure'
    else split_part(v_name, ' ', 1) || coalesce(' ' || nullif(left(split_part(v_name, ' ', 2), 1), '') || '.', '') end;
  new.verified := true;
  new.approved := false;   -- toda avaliação nova ou editada passa pela moderação
  new.reply := case when tg_op = 'UPDATE' then old.reply else null end;
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $$;
drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.review_guard();

-- média e total por peça (só avaliações aprovadas)
create or replace view public.product_ratings with (security_invoker = true) as
  select product_slug, round(avg(rating)::numeric, 1) as avg, count(*)::int as total
    from public.reviews where approved group by product_slug;
grant select on public.product_ratings to anon, authenticated;

-- fotos das avaliações: cada cliente envia para a própria pasta (uid/arquivo.jpg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reviews', 'reviews', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
drop policy if exists "reviews public read" on storage.objects;
drop policy if exists "reviews own write" on storage.objects;
drop policy if exists "reviews own delete" on storage.objects;
create policy "reviews public read" on storage.objects for select using (bucket_id = 'reviews');
create policy "reviews own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'reviews' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reviews own delete" on storage.objects for delete
  using (bucket_id = 'reviews' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------------
--  4. PEDIDO: confere e baixa o estoque do tamanho escolhido
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_items jsonb, p_address jsonb, p_shipping jsonb, p_payment text, p_coupon text default null, p_gift jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it jsonb; pr public.products; v_qty int; v_left int;
  v_sub numeric := 0; v_disc numeric := 0; v_ship numeric := coalesce((p_shipping->>'price')::numeric, 0);
  v_total numeric; v_order uuid; v_code text; cp jsonb;
begin
  if uid is null then raise exception 'Faça login para finalizar'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Sacola vazia'; end if;
  if p_payment not in ('pix', 'dinheiro', 'cartao') then raise exception 'Forma de pagamento inválida'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from public.products where slug = it->>'slug' and is_active for update;
    if not found then raise exception 'Produto indisponível: %', it->>'slug'; end if;
    v_qty := greatest(1, (it->>'qty')::int);
    if pr.stock_by_size ? (it->>'size') then
      v_left := (pr.stock_by_size ->> (it->>'size'))::int;
      if v_left < v_qty then
        raise exception '% no tamanho % %', pr.name, it->>'size',
          case when v_left <= 0 then 'esgotou' else 'tem só ' || v_left || ' unidade(s)' end;
      end if;
    end if;
    v_sub := v_sub + pr.price * v_qty;
  end loop;

  if v_ship < 0 or v_ship > 300 then v_ship := 0; end if;
  if v_sub >= 299 then v_ship := 0; end if;                  -- frete cortesia (igual a FREE_SHIPPING_FROM)
  if exists (select 1 from public.subscriptions s join public.plans p on p.slug = s.plan_slug
             where s.user_id = uid and s.status = 'ativa' and (p.kind = 'cercle' or p.slug = 'haute-couture'))
  then v_ship := 0; end if;

  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    cp := public.check_coupon(p_coupon, v_sub);
    if (cp->>'ok')::boolean then v_disc := (cp->>'discount')::numeric;
      update public.coupons set uses = uses + 1 where code = cp->>'code';
    end if;
  end if;

  if p_payment = 'pix' then v_disc := v_disc + round((v_sub - v_disc) * 0.05, 2); end if;
  v_total := greatest(0, v_sub - v_disc + v_ship);
  v_code := 'VL' || to_char(now(), 'YYMM') || '-' || upper(substr(md5(random()::text), 1, 5));

  insert into public.orders (code, user_id, subtotal, shipping, discount, total, coupon, payment_method,
                             shipping_method, address, gift)
  values (v_code, uid, v_sub, v_ship, v_disc, v_total, nullif(upper(trim(p_coupon)),''), p_payment,
          p_shipping->>'label', p_address, p_gift)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from public.products where slug = it->>'slug';
    v_qty := greatest(1, (it->>'qty')::int);
    insert into public.order_items (order_id, product_id, name, size, color, qty, unit_price)
    values (v_order, pr.id, pr.name, it->>'size', it->>'color', v_qty, pr.price);
    if pr.stock_by_size ? (it->>'size') then
      update public.products
         set stock_by_size = jsonb_set(stock_by_size, array[it->>'size'],
                               to_jsonb(greatest(0, (stock_by_size ->> (it->>'size'))::int - v_qty)))
       where id = pr.id;
    else
      update public.products set stock = greatest(0, stock - v_qty) where id = pr.id;
    end if;
  end loop;

  perform set_config('vellure.internal', '1', true);
  update public.profiles set petals = petals + floor(v_total)::int where id = uid;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total, 'shipping', v_ship, 'discount', v_disc);
end $$;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, text, jsonb) to authenticated;

-- devolve o estoque do tamanho quando um pedido é cancelado
create or replace function public.restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare i record;
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' then
    for i in select * from public.order_items where order_id = new.id loop
      update public.products
         set stock_by_size = case when stock_by_size ? i.size
               then jsonb_set(stock_by_size, array[i.size], to_jsonb((stock_by_size ->> i.size)::int + i.qty))
               else stock_by_size end,
             stock = case when stock_by_size ? i.size then stock else stock + i.qty end
       where id = i.product_id;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists orders_restock on public.orders;
create trigger orders_restock after update of status on public.orders
  for each row execute function public.restock_on_cancel();

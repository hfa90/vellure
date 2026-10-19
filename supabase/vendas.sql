-- =====================================================================
--  VELLURE · Rastreio público, sacola abandonada, kit presente,
--  cupom de aniversário e indique uma amiga.
--  Rode depois de estoque_avaliacoes.sql. Pode rodar de novo (idempotente).
-- =====================================================================

-- ---------------------------------------------------------------------
--  0. Valores (mude aqui e em js/config.js → VENDAS)
-- ---------------------------------------------------------------------
create or replace function public.vendas_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'gift_fee', 19.90,          -- embalagem para presente + cartão escrito à mão
    'birthday_percent', 15,     -- cupom do mês do aniversário
    'friend_percent', 10,       -- desconto da amiga indicada na primeira compra
    'referrer_petals', 500      -- pétalas para quem indicou, quando a compra da amiga é entregue
  )
$$;

-- ---------------------------------------------------------------------
--  1. RASTREIO PÚBLICO: linha do tempo com data de cada etapa
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists status_log jsonb not null default '[]'::jsonb;

create or replace function public.log_order_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_log := coalesce(new.status_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', new.status, 'at', now()));
  end if;
  return new;
end $$;
drop trigger if exists orders_status_log on public.orders;
create trigger orders_status_log before insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- pedidos antigos ganham o primeiro registro
update public.orders set status_log = jsonb_build_array(jsonb_build_object('status', status, 'at', created_at))
 where status_log = '[]'::jsonb;

-- número do pedido + CEP da entrega (ou os 4 últimos dígitos do WhatsApp). Não expõe endereço nem contato.
create or replace function public.track_order(p_code text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o public.orders; k text := regexp_replace(coalesce(p_key, ''), '\D', '', 'g'); first text;
begin
  if length(k) < 4 then return jsonb_build_object('ok', false, 'message', 'Informe o CEP da entrega ou os 4 últimos números do WhatsApp.'); end if;
  select * into o from public.orders where upper(code) = upper(trim(p_code));
  if not found
     or not (regexp_replace(coalesce(o.address->>'cep', ''), '\D', '', 'g') = k
             or (length(k) = 4 and right(regexp_replace(coalesce(o.address->>'phone', ''), '\D', '', 'g'), 4) = k)) then
    return jsonb_build_object('ok', false, 'message', 'Não encontramos um pedido com esses dados. Confira o número e o CEP.');
  end if;
  first := split_part(trim(coalesce(o.address->>'name', '')), ' ', 1);
  return jsonb_build_object('ok', true, 'code', o.code, 'status', o.status, 'created_at', o.created_at, 'log', o.status_log,
    'shipping_method', o.shipping_method, 'tracking', o.tracking, 'payment_method', o.payment_method, 'total', o.total,
    'name', first, 'city', o.address->>'city', 'state', o.address->>'state', 'gift', coalesce((o.gift->>'wrap')::boolean, false),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'size', i.size, 'qty', i.qty, 'slug', p.slug)), '[]'::jsonb)
                from public.order_items i left join public.products p on p.id = i.product_id where i.order_id = o.id));
end $$;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
--  2. SACOLA ABANDONADA
-- ---------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key,                 -- gerado no aparelho da cliente
  user_id uuid references auth.users(id) on delete set null,
  name text, phone text, email text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  updated_at timestamptz not null default now(),
  reminded_at timestamptz,
  reminder_coupon text,
  recovered_at timestamptz,
  order_code text
);
create index if not exists carts_open on public.carts (updated_at desc) where recovered_at is null;
alter table public.carts enable row level security;
drop policy if exists "admin all" on public.carts;
create policy "admin all" on public.carts for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.save_cart(p_id uuid, p_items jsonb, p_contact jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.carts; had boolean; v_items jsonb; v_sub numeric;
begin
  if p_id is null then return; end if;
  select * into c from public.carts where id = p_id;
  had := found;
  if had and c.user_id is not null and c.user_id is distinct from uid then return; end if;   -- sacola de outra pessoa
  if had and c.recovered_at is not null then return; end if;                                 -- já virou pedido
  -- só peças ativas, no máximo 30 linhas, preço do banco
  select coalesce(jsonb_agg(jsonb_build_object('slug', p.slug, 'size', x->>'size', 'qty', least(20, greatest(1, coalesce((x->>'qty')::int, 1))))), '[]'::jsonb),
         coalesce(sum(p.price * least(20, greatest(1, coalesce((x->>'qty')::int, 1)))), 0)
    into v_items, v_sub
    from (select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 30) t(x)
    join public.products p on p.slug = x->>'slug' and p.is_active;
  if uid is null and not had and coalesce(p_contact->>'phone', p_contact->>'email', '') = '' then return; end if; -- anônima sem contato: nada a guardar
  insert into public.carts (id, user_id, name, phone, email, items, subtotal, updated_at)
  values (p_id, uid, nullif(trim(p_contact->>'name'), ''), nullif(regexp_replace(coalesce(p_contact->>'phone', ''), '\D', '', 'g'), ''),
          nullif(lower(trim(p_contact->>'email')), ''), v_items, v_sub, now())
  on conflict (id) do update set
    user_id = coalesce(public.carts.user_id, excluded.user_id),
    name = coalesce(excluded.name, public.carts.name), phone = coalesce(excluded.phone, public.carts.phone), email = coalesce(excluded.email, public.carts.email),
    items = excluded.items, subtotal = excluded.subtotal,
    updated_at = case when excluded.items = public.carts.items then public.carts.updated_at else now() end;
end $$;
grant execute on function public.save_cart(uuid, jsonb, jsonb) to anon, authenticated;

-- link do lembrete: devolve as peças para a sacola em qualquer aparelho
create or replace function public.get_cart(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select items from public.carts where id = p_id and recovered_at is null), '[]'::jsonb)
$$;
grant execute on function public.get_cart(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
--  3. CUPONS PESSOAIS (aniversário) + proteção de dados do perfil
-- ---------------------------------------------------------------------
alter table public.coupons add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.coupons add column if not exists max_uses int;
alter table public.coupons add column if not exists note text;

create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.coupons; d numeric := 0;
begin
  select * into c from public.coupons where upper(code) = upper(trim(p_code)) and active
     and (expires_at is null or expires_at > now());
  if not found then return jsonb_build_object('ok', false, 'message', 'Cupom inválido ou expirado'); end if;
  if c.user_id is not null and c.user_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'message', 'Este cupom é pessoal e está ligado a outra conta');
  end if;
  if c.max_uses is not null and coalesce(c.uses, 0) >= c.max_uses then
    return jsonb_build_object('ok', false, 'message', 'Este cupom já foi usado');
  end if;
  if p_subtotal < coalesce(c.min_total, 0) then
    return jsonb_build_object('ok', false, 'message', 'Válido para compras acima de R$ ' || c.min_total);
  end if;
  d := case when c.kind = 'percent' then round(p_subtotal * c.value / 100, 2) else least(c.value, p_subtotal) end;
  return jsonb_build_object('ok', true, 'code', c.code, 'discount', d, 'kind', c.kind, 'value', c.value);
end $$;

-- ---------------------------------------------------------------------
--  4. INDIQUE UMA AMIGA
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer uuid not null references public.profiles(id) on delete cascade,
  referred uuid not null references public.profiles(id) on delete cascade unique,
  order_id uuid references public.orders(id) on delete set null,
  discount numeric(10,2),
  petals int,
  rewarded_at timestamptz,
  created_at timestamptz default now()
);
alter table public.referrals enable row level security;
drop policy if exists "admin all" on public.referrals;
drop policy if exists "own read" on public.referrals;
create policy "admin all" on public.referrals for all using (public.is_admin()) with check (public.is_admin());
create policy "own read" on public.referrals for select using (referrer = auth.uid() or referred = auth.uid());

create or replace function public.new_referral_code(p_name text) returns text
language plpgsql as $$
declare base text; c text; i int := 0;
begin
  base := upper(left(regexp_replace(translate(lower(split_part(trim(coalesce(p_name, '')), ' ', 1)),
            'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z]', '', 'g'), 8));
  if length(base) < 2 then base := 'VELLURE'; end if;
  loop
    c := base || (10 + floor(random() * 90))::int::text;
    exit when not exists (select 1 from public.profiles where referral_code = c);
    i := i + 1; if i > 20 then c := base || upper(substr(md5(random()::text), 1, 5)); exit; end if;
  end loop;
  return c;
end $$;

-- cadastro: gera o código pessoal e guarda quem indicou (vem de ?amiga=CODIGO)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ref uuid; nm text := coalesce(new.raw_user_meta_data->>'full_name', '');
begin
  select id into ref from public.profiles where referral_code = upper(trim(coalesce(new.raw_user_meta_data->>'ref', ''))) and id <> new.id;
  insert into public.profiles (id, email, full_name, phone, role, referral_code, referred_by)
  values (new.id, new.email, nm, coalesce(new.raw_user_meta_data->>'phone', ''),
          case when lower(new.email) = any(public.admin_emails()) then 'admin' else 'customer' end,
          public.new_referral_code(nm), ref)
  on conflict (id) do nothing;
  if ref is not null then insert into public.referrals (referrer, referred) values (ref, new.id) on conflict (referred) do nothing; end if;
  return new;
end $$;

update public.profiles set referral_code = public.new_referral_code(full_name) where referral_code is null;

-- clientes não mexem em pétalas, papel, código de indicação, quem indicou nem no aniversário depois de gravado
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if new.role <> old.role then new.role := old.role; end if;
  if new.petals <> old.petals and current_setting('vellure.internal', true) is distinct from '1' then new.petals := old.petals; end if;
  new.referral_code := old.referral_code;
  new.referred_by := old.referred_by;
  if old.birth_date is not null then new.birth_date := old.birth_date; end if;  -- muda só pela concierge
  return new;
end $$;

-- nome de quem indicou (só o primeiro nome) para a boas-vindas da amiga
create or replace function public.referrer_name(p_code text)
returns text language sql stable security definer set search_path = public as $$
  select nullif(split_part(trim(full_name), ' ', 1), '') from public.profiles where referral_code = upper(trim(p_code))
$$;
grant execute on function public.referrer_name(text) to anon, authenticated;

-- ---------------------------------------------------------------------
--  5. BENEFÍCIOS DA CLIENTE: aniversário + indicação
-- ---------------------------------------------------------------------
create or replace function public.my_perks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pf public.profiles; cfg jsonb := public.vendas_cfg();
        bday jsonb := null; v_code text; cp public.coupons; friend jsonb := null; refs jsonb;
begin
  if uid is null then return '{}'::jsonb; end if;
  select * into pf from public.profiles where id = uid;
  -- aniversário: no mês da data de nascimento, um cupom pessoal de uso único
  if pf.birth_date is not null and extract(month from pf.birth_date) = extract(month from current_date) then
    v_code := 'NIVER' || upper(substr(md5(uid::text || extract(year from current_date)::text), 1, 5));
    insert into public.coupons (code, kind, value, min_total, active, expires_at, user_id, max_uses, note)
    values (v_code, 'percent', (cfg->>'birthday_percent')::numeric, 0, true,
            (date_trunc('month', current_date) + interval '1 month')::timestamptz, uid, 1, 'Aniversário')
    on conflict (code) do nothing;
    select * into cp from public.coupons where code = v_code;
    bday := jsonb_build_object('code', cp.code, 'percent', cp.value, 'until', cp.expires_at, 'used', coalesce(cp.uses, 0) >= coalesce(cp.max_uses, 1));
  end if;
  -- foi indicada e ainda não comprou: desconto na primeira compra
  if pf.referred_by is not null and not exists (select 1 from public.orders where user_id = uid and status <> 'cancelado') then
    friend := jsonb_build_object('percent', (cfg->>'friend_percent')::numeric,
                                 'from', (select split_part(trim(full_name), ' ', 1) from public.profiles where id = pf.referred_by));
  end if;
  select jsonb_build_object('code', pf.referral_code, 'friends', count(*), 'bought', count(*) filter (where order_id is not null),
                            'rewarded', count(*) filter (where rewarded_at is not null), 'petals', coalesce(sum(petals) filter (where rewarded_at is not null), 0),
                            'friend_percent', (cfg->>'friend_percent')::numeric, 'referrer_petals', (cfg->>'referrer_petals')::int)
    into refs from public.referrals where referrer = uid;
  return jsonb_build_object('birthday', bday, 'friend', friend, 'referral', refs, 'gift_fee', (cfg->>'gift_fee')::numeric);
end $$;
grant execute on function public.my_perks() to authenticated;

-- pétalas para quem indicou quando o pedido da amiga é entregue
create or replace function public.reward_referral() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.referrals; pts int := (public.vendas_cfg()->>'referrer_petals')::int;
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue' then
    select * into r from public.referrals where order_id = new.id and rewarded_at is null;
    if found then
      perform set_config('vellure.internal', '1', true);
      update public.profiles set petals = petals + pts where id = r.referrer;
      update public.referrals set rewarded_at = now(), petals = pts where id = r.id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_reward_referral on public.orders;
create trigger orders_reward_referral after update of status on public.orders
  for each row execute function public.reward_referral();

-- ---------------------------------------------------------------------
--  6. PEDIDO: estoque por tamanho + presente + aniversário/amiga + sacola recuperada
-- ---------------------------------------------------------------------
drop function if exists public.place_order(jsonb, jsonb, jsonb, text, text, jsonb);
create or replace function public.place_order(
  p_items jsonb, p_address jsonb, p_shipping jsonb, p_payment text, p_coupon text default null,
  p_gift jsonb default null, p_cart uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); cfg jsonb := public.vendas_cfg(); pf public.profiles;
  it jsonb; pr public.products; v_qty int; v_left int;
  v_sub numeric := 0; v_disc numeric := 0; v_cdisc numeric := 0; v_fdisc numeric := 0; v_gift numeric := 0;
  v_ship numeric := coalesce((p_shipping->>'price')::numeric, 0);
  v_total numeric; v_order uuid; v_code text; cp jsonb; v_coupon text := null; v_giftj jsonb := null; v_friend boolean := false;
begin
  if uid is null then raise exception 'Faça login para finalizar'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Sacola vazia'; end if;
  if p_payment not in ('pix', 'dinheiro', 'cartao') then raise exception 'Forma de pagamento inválida'; end if;
  select * into pf from public.profiles where id = uid;

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
  if v_sub >= 299 then v_ship := 0; end if;
  if exists (select 1 from public.subscriptions s join public.plans p on p.slug = s.plan_slug
             where s.user_id = uid and s.status = 'ativa' and (p.kind = 'cercle' or p.slug = 'haute-couture'))
  then v_ship := 0; end if;

  -- cupom × presente da amiga: vale o maior (não acumulam)
  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    cp := public.check_coupon(p_coupon, v_sub);
    if (cp->>'ok')::boolean then v_cdisc := (cp->>'discount')::numeric; v_coupon := cp->>'code'; end if;
  end if;
  if pf.referred_by is not null and not exists (select 1 from public.orders where user_id = uid and status <> 'cancelado') then
    v_fdisc := round(v_sub * (cfg->>'friend_percent')::numeric / 100, 2);
  end if;
  if v_fdisc > v_cdisc then v_disc := v_fdisc; v_coupon := null; v_friend := true;
  else v_disc := v_cdisc;
    if v_coupon is not null then update public.coupons set uses = coalesce(uses, 0) + 1 where code = v_coupon; end if;
  end if;

  if p_payment = 'pix' then v_disc := v_disc + round((v_sub - v_disc) * 0.05, 2); end if;

  if coalesce((p_gift->>'wrap')::boolean, false) then
    v_gift := (cfg->>'gift_fee')::numeric;
    v_giftj := jsonb_build_object('wrap', true, 'fee', v_gift,
      'to', left(trim(coalesce(p_gift->>'to', '')), 60), 'from', left(trim(coalesce(p_gift->>'from', '')), 60),
      'message', left(trim(coalesce(p_gift->>'message', '')), 240), 'hide_price', coalesce((p_gift->>'hide_price')::boolean, true));
  end if;

  v_total := greatest(0, v_sub - v_disc + v_ship + v_gift);
  v_code := 'VL' || to_char(now(), 'YYMM') || '-' || upper(substr(md5(random()::text), 1, 5));

  insert into public.orders (code, user_id, subtotal, shipping, discount, total, coupon, payment_method,
                             shipping_method, address, gift)
  values (v_code, uid, v_sub, v_ship, v_disc, v_total, case when v_friend then 'AMIGA' else v_coupon end, p_payment,
          p_shipping->>'label', p_address, v_giftj)
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

  if v_friend then update public.referrals set order_id = v_order, discount = v_fdisc where referred = uid and order_id is null; end if;
  update public.carts set recovered_at = now(), order_code = v_code
   where recovered_at is null and (id = p_cart or user_id = uid);

  perform set_config('vellure.internal', '1', true);
  update public.profiles set petals = petals + floor(v_total)::int where id = uid;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total, 'shipping', v_ship, 'discount', v_disc,
                            'gift_fee', v_gift, 'friend', v_friend);
end $$;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, text, jsonb, uuid) to authenticated;

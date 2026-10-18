-- VELLURE · Box Misteriosa VIP (assinatura recorrente)
-- Rode no SQL Editor do Supabase DEPOIS do schema.sql. Pode rodar de novo sem duplicar.

alter table public.plans add column if not exists billing_months int not null default 1;

-- planos novos (preço = valor mensal; billing_months = de quantos em quantos meses cobra)
insert into public.plans (slug, kind, name, tagline, price, perks, highlight, sort, billing_months) values
('vip-essencial-mensal','box','Box Essencial Mensal','Uma lingerie surpresa por mês',89.9,'[]',false,20,1),
('vip-essencial-trimestral','box','Box Essencial Trimestral','Uma lingerie surpresa por mês',79.9,'[]',false,21,3),
('vip-essencial-semestral','box','Box Essencial Semestral','Uma lingerie surpresa por mês',69.9,'[]',false,22,6),
('vip-duo-mensal','box','Box Duo Mensal','Lingerie + 1 peça extra por mês',149.9,'[]',true,23,1),
('vip-duo-trimestral','box','Box Duo Trimestral','Lingerie + 1 peça extra por mês',134.9,'[]',true,24,3),
('vip-duo-semestral','box','Box Duo Semestral','Lingerie + 1 peça extra por mês',119.9,'[]',true,25,6)
on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, price = excluded.price,
  highlight = excluded.highlight, sort = excluded.sort, billing_months = excluded.billing_months, active = true;

-- as boxes antigas de demonstração saem da vitrine
update public.plans set active = false where kind = 'box' and slug not like 'vip-%';

-- assinatura com a próxima cobrança respeitando a frequência do plano
create or replace function public.subscribe_plan(p_plan text, p_preferences jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pl public.plans; sid uuid;
begin
  if uid is null then raise exception 'Faça login para assinar'; end if;
  select * into pl from public.plans where slug = p_plan and active;
  if not found then raise exception 'Plano indisponível'; end if;
  update public.subscriptions s set status = 'cancelada'
   from public.plans p where p.slug = s.plan_slug and p.kind = pl.kind and s.user_id = uid and s.status <> 'cancelada';
  insert into public.subscriptions (user_id, plan_slug, preferences, next_billing)
  values (uid, p_plan, coalesce(p_preferences, '{}'::jsonb), (current_date + make_interval(months => coalesce(pl.billing_months, 1)))::date)
  returning id into sid;
  if pl.kind = 'box' then
    insert into public.boxes (subscription_id, month, theme)
    values (sid, date_trunc('month', current_date + interval '1 month')::date, 'Primeira box: boas-vindas à Maison');
  end if;
  return jsonb_build_object('id', sid, 'plan', pl.name);
end $$;
grant execute on function public.subscribe_plan(text, jsonb) to authenticated;

-- a cliente só pode mudar status e data da próxima box (pausar, retomar, pular, cancelar)
create or replace function public.protect_subscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.plan_slug := old.plan_slug; new.user_id := old.user_id; new.preferences := coalesce(new.preferences, old.preferences);
    if new.next_billing > old.next_billing + interval '2 months' then new.next_billing := old.next_billing; end if;
  end if;
  return new;
end $$;
drop trigger if exists subscriptions_protect on public.subscriptions;
create trigger subscriptions_protect before update on public.subscriptions for each row execute function public.protect_subscription();

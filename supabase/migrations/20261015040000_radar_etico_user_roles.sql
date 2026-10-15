-- Radar Ético — user_roles com nome/e-mail + auto-provisionamento no signup
-- O front lista usuários (nome, e-mail, papel, UF) usando só a anon key;
-- auth.users não é legível pelo front, então denormalizamos nome/e-mail aqui.

alter table public.user_roles
  add column if not exists nome  text,
  add column if not exists email text;

-- Preenche a partir do auth.users quando possível (ignora se já preenchido)
update public.user_roles ur
set nome  = coalesce(ur.nome,  nullif(au.raw_user_meta_data ->> 'nome', ''),
                     split_part(au.email, '@', 1)),
    email = coalesce(ur.email, au.email)
from auth.users au
where au.id = ur.user_id
  and (ur.nome is null or ur.email is null);

create or replace function public.provision_user_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role, seccional_uf, nome, email)
  values (
    new.id,
    'leitor', -- papel inicial mais restritivo; um admin promove depois
    null,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_provision_role on auth.users;
create trigger on_auth_user_created_provision_role
  after insert on auth.users
  for each row execute function public.provision_user_role();

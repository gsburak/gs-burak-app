-- SOLO proyecto GS BURAK (no PESTI PRO).
-- Aplicar después de configurar GS_SUPABASE_SECRET_KEY y publicar el servidor.
-- No borra ni cambia registros. Impide acceso directo con claves públicas.
begin;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_state', 'app_clientes', 'app_productos', 'app_tipos_servicio',
    'app_servicios', 'app_programaciones', 'app_compras', 'app_gastos', 'app_equipos'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
      execute format('alter table public.%I enable row level security', table_name);
      execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    end if;
  end loop;
end;
$$;
notify pgrst, 'reload schema';
commit;

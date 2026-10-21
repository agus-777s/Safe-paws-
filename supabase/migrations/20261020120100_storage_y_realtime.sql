-- Migración: bucket de fotos y publicación Realtime.
-- Fotos de perfil, mascotas, chat y servicio. Lectura pública por URL;
-- cada usuario solo escribe dentro de su carpeta `<auth.uid()>/...`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Fotos: subir a la carpeta propia" on storage.objects;
create policy "Fotos: subir a la carpeta propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Fotos: editar la carpeta propia" on storage.objects;
create policy "Fotos: editar la carpeta propia" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Fotos: borrar de la carpeta propia" on storage.objects;
create policy "Fotos: borrar de la carpeta propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Realtime: chat, seguimiento en vivo, novedades del servicio y estados de reserva.
do $$
declare
  v_tabla text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach v_tabla in array array['mensajes', 'seguimiento_puntos', 'actualizaciones_servicio', 'reservas'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_tabla
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_tabla);
    end if;
  end loop;
end;
$$;

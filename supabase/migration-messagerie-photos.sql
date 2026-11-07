-- Messagerie : photos chiffrées. Le bucket ne contient que des blobs chiffrés (AES-GCM, clé
-- envoyée dans le message chiffré de bout en bout) : lisible publiquement, illisible sans la clé.
insert into storage.buckets (id, name, public) values ('dm', 'dm', true) on conflict (id) do nothing;
drop policy if exists "dm lecture" on storage.objects;
create policy "dm lecture" on storage.objects for select using (bucket_id = 'dm');
drop policy if exists "dm envoi" on storage.objects;
create policy "dm envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'dm' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "dm suppression" on storage.objects;
create policy "dm suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'dm' and (storage.foldername(name))[1] = auth.uid()::text);

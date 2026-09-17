insert into storage.buckets (id, name, public)
values ('chroma-releases', 'chroma-releases', true)
on conflict (id) do update set public = true;

create policy "Chroma authenticated uploads"
on storage.objects for insert to authenticated
with check (bucket_id = 'chroma-releases');

create policy "Chroma authenticated updates"
on storage.objects for update to authenticated
using (bucket_id = 'chroma-releases')
with check (bucket_id = 'chroma-releases');

create policy "Chroma authenticated deletes"
on storage.objects for delete to authenticated
using (bucket_id = 'chroma-releases');

create policy "Chroma public downloads"
on storage.objects for select to public
using (bucket_id = 'chroma-releases');

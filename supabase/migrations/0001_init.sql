-- Sourcebook schema.
-- Everything is scoped to a notebook, and every notebook belongs to one user.
-- Row level security is what enforces that; the client never filters by user_id.

create extension if not exists vector;

create table notebooks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null default 'Neues Notebook',
  created_at timestamptz not null default now()
);

create table sources (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks on delete cascade,
  title       text not null,
  kind        text not null check (kind in ('pdf', 'text', 'url')),
  -- The full extracted text is kept so the UI can show a citation in context.
  content     text not null,
  created_at  timestamptz not null default now()
);

create table chunks (
  id          bigserial primary key,
  source_id   uuid not null references sources on delete cascade,
  notebook_id uuid not null references notebooks on delete cascade,
  idx         int  not null,
  content     text not null,
  -- 384 dimensions: that is what gte-small produces, the model that runs
  -- inside the edge function. No embedding provider, no extra API key.
  embedding   vector(384)
);

create table messages (
  id          bigserial primary key,
  notebook_id uuid not null references notebooks on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  citations   jsonb,
  created_at  timestamptz not null default now()
);

create index chunks_notebook_idx on chunks (notebook_id);
create index sources_notebook_idx on sources (notebook_id);
create index messages_notebook_idx on messages (notebook_id, created_at);

-- HNSW over cosine distance. Fine up to a few hundred thousand chunks,
-- which is far beyond anything a single notebook will hold.
create index chunks_embedding_idx on chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table notebooks enable row level security;
alter table sources   enable row level security;
alter table chunks    enable row level security;
alter table messages  enable row level security;

create policy "own notebooks" on notebooks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The child tables inherit the check through their notebook.
create policy "own sources" on sources
  for all using (
    exists (select 1 from notebooks n where n.id = notebook_id and n.user_id = auth.uid())
  ) with check (
    exists (select 1 from notebooks n where n.id = notebook_id and n.user_id = auth.uid())
  );

create policy "own chunks" on chunks
  for all using (
    exists (select 1 from notebooks n where n.id = notebook_id and n.user_id = auth.uid())
  ) with check (
    exists (select 1 from notebooks n where n.id = notebook_id and n.user_id = auth.uid())
  );

create policy "own messages" on messages
  for all using (
    exists (select 1 from notebooks n where n.id = notebook_id and n.user_id = auth.uid())
  ) with check (
    exists (select 1 from notebooks n where n.id = notebook_id and n.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Vector search
-- ---------------------------------------------------------------------------

-- Returns the chunks of one notebook closest to the query embedding.
-- security invoker means the caller's RLS still applies: a user cannot read
-- another user's notebook through this function.
create or replace function match_chunks (
  query_embedding vector(384),
  target_notebook uuid,
  match_count     int default 8
)
returns table (
  id           bigint,
  source_id    uuid,
  source_title text,
  idx          int,
  content      text,
  similarity   float
)
language sql stable security invoker
as $$
  select
    c.id,
    c.source_id,
    s.title as source_title,
    c.idx,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join sources s on s.id = c.source_id
  where c.notebook_id = target_notebook
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

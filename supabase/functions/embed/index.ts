// The only thing left in Supabase's edge runtime.
//
// Everything else in this app is a Next.js route handler. This function exists
// because `Supabase.ai.Session` is only available inside Supabase's own edge
// runtime — that is where the gte-small model is hosted. Keeping it here means
// no embedding provider and no second API key.
//
// It takes an array so that ingesting a 50-chunk document is one network call,
// not fifty.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { texts } = await req.json();
    if (!Array.isArray(texts) || texts.length === 0) {
      return json({ error: "texts muss ein nicht leeres Array sein" }, 400);
    }

    const session = new Supabase.ai.Session("gte-small");
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(
        (await session.run(text, { mean_pool: true, normalize: true })) as number[],
      );
    }

    return json({ embeddings });
  } catch (err) {
    console.error("embed failed", err);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

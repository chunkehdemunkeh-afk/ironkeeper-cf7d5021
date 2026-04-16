import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") || "1";
  const barcode = url.searchParams.get("barcode") || "";

  try {
    let offUrl: string;
    if (barcode) {
      offUrl = `https://uk.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_size,nutriments,image_front_small_url`;
    } else {
      offUrl = `https://uk.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&page=${page}&fields=code,product_name,brands,serving_size,nutriments,image_front_small_url`;
    }

    const res = await fetch(offUrl, {
      headers: {
        "User-Agent": "IronKeeper/1.0 (https://ironkeeper.lovable.app; contact@ironkeeper.app)",
      },
    });

    if (!res.ok) {
      // Consume the body to avoid resource leaks
      await res.text();
      return new Response(
        JSON.stringify({ products: [], error: "SERVICE_UNAVAILABLE", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.text();
    return new Response(data, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ products: [], error: (error as Error).message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get("FATSECRET_CONSUMER_KEY");
  const clientSecret = Deno.env.get("FATSECRET_CONSUMER_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("FatSecret credentials not configured");
  }

  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FatSecret auth failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "0");
  const barcode = url.searchParams.get("barcode") || "";

  try {
    const token = await getAccessToken();
    let apiUrl: string;

    if (barcode) {
      apiUrl = `https://platform.fatsecret.com/rest/food/barcode/find-by-id/v1?barcode=${encodeURIComponent(barcode)}&format=json`;
    } else {
      apiUrl = `https://platform.fatsecret.com/rest/foods/search/v1?search_expression=${encodeURIComponent(query)}&format=json&max_results=20&page_number=${page}`;
    }

    const res = await fetch(apiUrl, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`FatSecret API error [${res.status}]:`, text);
      return new Response(
        JSON.stringify({ foods: [], error: "API_ERROR" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("FatSecret edge function error:", error);
    return new Response(
      JSON.stringify({ foods: [], error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

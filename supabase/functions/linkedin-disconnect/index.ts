import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405)
  }

  try {
    const authHeader = req.headers.get("Authorization") || ""

    if (!authHeader.startsWith("Bearer ")) {
      return json(
        {
          success: false,
          error: "Missing or invalid Authorization header",
        },
        401
      )
    }

    const jwt = authHeader.slice(7)

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    })

    const { data: userData, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userData?.user) {
      return json(
        {
          success: false,
          error: userError?.message || "Invalid or expired token",
        },
        401
      )
    }

    const userId = userData.user.id

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_connected: false,
        linkedin_access_token: null,
        linkedin_token_expires_at: null,
        linkedin_profile_id: null,
        linkedin_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[linkedin-disconnect] Profile update error:", updateError)

      return json(
        {
          success: false,
          error: updateError.message,
        },
        500
      )
    }

    return json({
      success: true,
      disconnected: true,
    })
  } catch (err) {
    console.error("[linkedin-disconnect] Unexpected error:", err)

    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500
    )
  }
})

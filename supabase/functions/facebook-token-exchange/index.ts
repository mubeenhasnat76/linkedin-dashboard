import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const FACEBOOK_APP_ID = Deno.env.get("FACEBOOK_APP_ID") || ""
const FACEBOOK_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

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
        { success: false, error: "Missing or invalid Authorization header" },
        401
      )
    }

    const jwt = authHeader.slice(7)

    // Match LinkedIn pattern: validate JWT via Supabase Auth using anon key + user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
      auth: {
        persistSession: false,
      },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData?.user) {
      return json(
        { success: false, error: userError?.message || "Invalid or expired token" },
        401
      )
    }

    const userId = userData.user.id

    const body = await req.json()
    const { code, redirect_uri } = body

    if (!code || !redirect_uri) {
      return json({
        success: false,
        error: "Missing required fields: code, redirect_uri",
      })
    }

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return json(
        { success: false, error: "Facebook credentials are missing from Supabase Secrets." },
        500
      )
    }

    // Exchange authorization code for access token (server-side, no PKCE needed)
    const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token")
    tokenUrl.searchParams.set("client_id", FACEBOOK_APP_ID)
    tokenUrl.searchParams.set("client_secret", FACEBOOK_APP_SECRET)
    tokenUrl.searchParams.set("redirect_uri", redirect_uri)
    tokenUrl.searchParams.set("code", code)

    const tokenResp = await fetch(tokenUrl.toString())
    const tokenData = await tokenResp.json()

    if (!tokenResp.ok || tokenData.error) {
      return json(
        {
          success: false,
          error: tokenData.error?.message || tokenData.error || "Failed to exchange authorization code",
        },
        tokenResp.status
      )
    }

    const accessToken = tokenData.access_token

    // Fetch Facebook user profile
    const meResp = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`
    )
    const meData = await meResp.json()

    if (!meResp.ok || meData.error) {
      return json(
        {
          success: false,
          error: meData.error?.message || "Failed to fetch Facebook profile",
        },
        meResp.status
      )
    }

    // Fetch pages the user manages
    const pagesResp = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`
    )
    const pagesData = await pagesResp.json()

    let pageId: string | null = null
    let pageName: string | null = null
    let pageAccessToken: string | null = null

    if (pagesData && pagesData.data && pagesData.data.length > 0) {
      pageId = pagesData.data[0].id
      pageName = pagesData.data[0].name
      pageAccessToken = pagesData.data[0].access_token
    }

    // Use service role client for DB writes (bypasses RLS)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    })

    // Delete any existing connection for this user
    await adminClient
      .from("facebook_connections")
      .delete()
      .eq("user_id", userId)

    // Insert new connection
    const { error: insertError } = await adminClient
      .from("facebook_connections")
      .insert({
        user_id: userId,
        facebook_user_id: meData.id,
        facebook_name: meData.name,
        page_id: pageId,
        page_name: pageName,
        access_token: accessToken,
        page_access_token: pageAccessToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error("[facebook-token-exchange] Insert error:", insertError)
      return json(
        { success: false, error: insertError.message },
        500
      )
    }

    return json({
      success: true,
      facebook_name: meData.name,
      page_name: pageName,
      page_id: pageId,
    })
  } catch (err) {
    console.error("[facebook-token-exchange] Unexpected error:", err)
    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500
    )
  }
})

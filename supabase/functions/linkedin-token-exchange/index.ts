import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID") || ""
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET") || ""
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
          error: "Invalid or expired token",
        },
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

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return json(
        {
          success: false,
          error: "LinkedIn credentials are missing from Supabase Secrets.",
        },
        500
      )
    }

    // Safe debugging
    console.log("===== LinkedIn Token Exchange =====")
    console.log("Client ID Length:", LINKEDIN_CLIENT_ID.length)
    console.log("Client Secret Length:", LINKEDIN_CLIENT_SECRET.length)
    console.log("Redirect URI:", redirect_uri)

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    })

    const tokenResp = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    )

    const tokenData = await tokenResp.json()

    console.log("LinkedIn HTTP Status:", tokenResp.status)
    console.log("LinkedIn Response:", JSON.stringify(tokenData))

    if (!tokenResp.ok || !tokenData.access_token) {
      return json(
        {
          success: false,
          status: tokenResp.status,
          linkedin_response: tokenData,
        },
        tokenResp.status
      )
    }

    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in || 5184000
    const expiresAt = new Date(
      Date.now() + expiresIn * 1000
    ).toISOString()

    const profileResp = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const profile = await profileResp.json()

    console.log("LinkedIn Profile:", JSON.stringify(profile))

    if (!profileResp.ok) {
      return json(
        {
          success: false,
          error: "Failed to fetch LinkedIn profile",
          profile,
        },
        profileResp.status
      )
    }

    const linkedinProfileId = profile.sub || ""
    const linkedinName = profile.name || ""

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_connected: true,
        linkedin_access_token: accessToken,
        linkedin_token_expires_at: expiresAt,
        linkedin_profile_id: linkedinProfileId,
        linkedin_name: linkedinName,
      })
      .eq("id", userId)

    if (updateError) {
      console.error(updateError)

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
      connected: true,
    })
  } catch (err) {
    console.error(err)

    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500
    )
  }
})
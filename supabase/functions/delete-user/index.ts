const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errorResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errDetail(e: unknown): { message: string; stack: string | undefined } {
  if (e instanceof Error) {
    return { message: e.message, stack: e.stack };
  }
  return { message: String(e), stack: undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, { error: "Method not allowed", step: "method-check" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, { error: "Missing auth token", step: "auth-header" });
    }

    const rawUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("EXPO_PUBLIC_SUPABASE_URL") || "";
    const supabaseUrl = rawUrl.replace(/\/+$/, "");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") || "";

    console.log("[delete-user] supabaseUrl:", supabaseUrl);
    console.log("[delete-user] serviceRoleKey set:", !!serviceRoleKey);
    console.log("[delete-user] anonKey set:", !!anonKey);

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, {
        error: "Server not configured",
        step: "env-check",
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
        hasAnonKey: !!anonKey,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the caller by fetching their user info with their own token
    let userRes: Response;
    try {
      userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
      });
    } catch (e) {
      const d = errDetail(e);
      console.error("[delete-user] Token verification fetch threw:", d.message, d.stack);
      return errorResponse(500, {
        error: "Token verification request failed",
        step: "verify-fetch",
        message: d.message,
        stack: d.stack,
      });
    }

    if (!userRes.ok) {
      let verifyBody = "";
      try {
        verifyBody = await userRes.text();
      } catch (e) {
        const d = errDetail(e);
        verifyBody = `could not read response body: ${d.message}`;
      }
      console.error("[delete-user] Token verification failed:", userRes.status, verifyBody);
      return errorResponse(401, {
        error: "Invalid token",
        step: "verify",
        status: userRes.status,
        detail: verifyBody,
        supabaseUrl,
        anonKeyPresent: !!anonKey,
      });
    }

    let userData: { id?: string; email?: string };
    try {
      userData = await userRes.json();
    } catch (e) {
      const d = errDetail(e);
      console.error("[delete-user] Failed to parse user JSON:", d.message, d.stack);
      return errorResponse(500, {
        error: "Failed to parse user info response",
        step: "parse-user",
        message: d.message,
        stack: d.stack,
      });
    }

    const userId = userData.id;

    if (!userId) {
      return errorResponse(400, {
        error: "Could not resolve user ID",
        step: "resolve-id",
        userData,
      });
    }

    console.log("[delete-user] Deleting data for user:", userId);

    const adminHeaders = {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    };

    const tableErrors: Array<{ table: string; status: number; detail: string }> = [];

    // Tables with ON DELETE SET NULL on user_id — we delete the user's rows
    // so their content doesn't linger with null user_id.
    // Tables with ON DELETE CASCADE (notifications, reports, user_profiles)
    // are handled automatically when we delete the auth user below.
    const tableDeletes = [
      `${supabaseUrl}/rest/v1/catches?user_id=eq.${userId}`,
      `${supabaseUrl}/rest/v1/point_posts?user_id=eq.${userId}`,
      `${supabaseUrl}/rest/v1/point_comments?user_id=eq.${userId}`,
      `${supabaseUrl}/rest/v1/feedback?user_id=eq.${userId}`,
      `${supabaseUrl}/rest/v1/app_settings?id=eq.${userId}`,
    ];

    for (const url of tableDeletes) {
      const tableName = url.match(/rest\/v1\/(\w+)/)?.[1] ?? url;
      try {
        const delRes = await fetch(url, { method: "DELETE", headers: adminHeaders });
        if (!delRes.ok) {
          let bodyText = "";
          try {
            bodyText = await delRes.text();
          } catch {
            bodyText = "unreadable body";
          }
          console.error(`[delete-user] Table delete failed (${tableName}):`, delRes.status, bodyText);
          tableErrors.push({ table: tableName, status: delRes.status, detail: bodyText });
        } else {
          console.log(`[delete-user] Table delete OK (${tableName})`);
        }
      } catch (e) {
        const d = errDetail(e);
        console.error(`[delete-user] Table delete threw (${tableName}):`, d.message, d.stack);
        tableErrors.push({ table: tableName, status: -1, detail: d.message, stack: d.stack });
      }
    }

    if (tableErrors.length > 0) {
      console.log("[delete-user] Table deletion errors:", JSON.stringify(tableErrors));
    }

    // Delete the auth user (requires service role).
    // This cascades to: notifications (CASCADE), reports (CASCADE), user_profiles (CASCADE).
    // It sets user_id=NULL on: catches, feedback, point_comments, point_posts (SET NULL).
    let deleteUserRes: Response;
    try {
      deleteUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
    } catch (e) {
      const d = errDetail(e);
      console.error("[delete-user] Auth user delete fetch threw:", d.message, d.stack);
      return errorResponse(500, {
        error: "Failed to delete account",
        step: "auth-delete-fetch",
        message: d.message,
        stack: d.stack,
        tableErrors,
      });
    }

    if (!deleteUserRes.ok) {
      let errBody = "";
      try {
        errBody = await deleteUserRes.text();
      } catch (e) {
        const d = errDetail(e);
        errBody = `could not read response body: ${d.message}`;
      }
      console.error("[delete-user] Failed to delete auth user:", deleteUserRes.status, errBody);
      return errorResponse(500, {
        error: "Failed to delete account",
        step: "auth-delete",
        status: deleteUserRes.status,
        detail: errBody,
        tableErrors,
      });
    }

    console.log("[delete-user] Successfully deleted user:", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const d = errDetail(e);
    console.error("[delete-user] Uncaught error:", d.message, d.stack);
    return errorResponse(500, {
      error: "Unexpected server error",
      step: "uncaught",
      message: d.message,
      stack: d.stack,
    });
  }
});

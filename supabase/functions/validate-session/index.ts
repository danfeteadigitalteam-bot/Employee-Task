import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_token, employee_id } = await req.json();

    if (!session_token || !employee_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Session token and employee ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Hash the session token to compare
    const tokenHash = await hashString(session_token);

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("session_token_hash", tokenHash)
      .eq("employee_id", employee_id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh session expiry (sliding window) - extends by 30 days on each valid visit
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("user_sessions")
      .update({ expires_at: newExpiresAt })
      .eq("id", session.id);

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("*, departments(name)")
      .eq("id", employee_id)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ valid: false, error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!employee.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: "Account is deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pin_hash, ...employeeData } = employee;

    return new Response(
      JSON.stringify({ valid: true, employee: employeeData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

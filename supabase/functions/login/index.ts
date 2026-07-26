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
    const { employee_code, pin } = await req.json();

    if (!employee_code || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: "Employee code and PIN are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find employee by code
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("employee_code", employee_code.toUpperCase())
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid employee code or PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!employee.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Account is deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify PIN using bcrypt comparison
    const pinValid = await verifyPin(pin, employee.pin_hash);

    if (!pinValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid employee code or PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    const tokenHash = await hashString(sessionToken);

    // Clean up expired sessions
    await supabase
      .from("user_sessions")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // Create new session (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: sessionError } = await supabase
      .from("user_sessions")
      .insert({
        employee_id: employee.id,
        session_token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (sessionError) {
      throw sessionError;
    }

    // Get department name
    const { data: department } = await supabase
      .from("departments")
      .select("name")
      .eq("id", employee.department_id)
      .single();

    const { pin_hash, ...employeeData } = employee;

    return new Response(
      JSON.stringify({
        success: true,
        session_token: sessionToken,
        employee: { ...employeeData, department },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);
    const pinHash = await crypto.subtle.digest("SHA-256", pinData);
    const pinHashHex = Array.from(new Uint8Array(pinHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return pinHashHex === storedHash;
  } catch {
    return false;
  }
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

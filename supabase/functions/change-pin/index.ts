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
    const { employee_id, current_pin, new_pin } = await req.json();

    if (!employee_id || !current_pin || !new_pin) {
      return new Response(
        JSON.stringify({ success: false, error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{6}$/.test(new_pin)) {
      return new Response(
        JSON.stringify({ success: false, error: "New PIN must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get employee
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("pin_hash")
      .eq("id", employee_id)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ success: false, error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify current PIN
    const currentValid = await verifyPin(current_pin, employee.pin_hash);
    if (!currentValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Current PIN is incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash new PIN
    const newPinHash = await hashPin(new_pin);

    // Update PIN
    const { error: updateError } = await supabase
      .from("employees")
      .update({ pin_hash: newPinHash, must_change_pin: false })
      .eq("id", employee_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "PIN changed successfully" }),
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

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

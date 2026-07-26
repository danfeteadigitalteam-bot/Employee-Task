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
    const { admin_id, employee_id, new_pin } = await req.json();

    if (!admin_id || !employee_id || !new_pin) {
      return new Response(
        JSON.stringify({ success: false, error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{6}$/.test(new_pin)) {
      return new Response(
        JSON.stringify({ success: false, error: "PIN must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin role
    const { data: admin, error: adminError } = await supabase
      .from("employees")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (adminError || !admin || admin.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash new PIN
    const newPinHash = await hashPin(new_pin);

    // Update employee PIN
    const { error: updateError } = await supabase
      .from("employees")
      .update({ pin_hash: newPinHash, must_change_pin: true })
      .eq("id", employee_id);

    if (updateError) throw updateError;

    // Delete all existing sessions for the employee
    await supabase
      .from("user_sessions")
      .delete()
      .eq("employee_id", employee_id);

    return new Response(
      JSON.stringify({ success: true, message: "PIN reset successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

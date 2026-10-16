import { requireSupabase } from "./supabase.js";

export async function getDashboardSummary() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("dashboard_summary");
  if (error) throw error;
  return data;
}

export async function getDailySales({ days = 14 } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("daily_sales_report", {
    p_days: days,
  });
  if (error) throw error;
  return data ?? [];
}

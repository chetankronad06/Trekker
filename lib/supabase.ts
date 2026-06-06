import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co"
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
  return createClient(url, serviceKey)
}

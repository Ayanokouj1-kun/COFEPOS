import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hnfugjsgqywsdxkuwmvi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZnVnanNncXl3c2R4a3V3bXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzI1NTcsImV4cCI6MjA5ODU0ODU1N30.jkw1HiRF6tqnacrKpKnS2iVgRA3YNxmfMgC0AZ8RB8U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

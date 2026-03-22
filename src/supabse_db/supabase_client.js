import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qcnljiogxnmfugcaqxge.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmxqaW9neG5tZnVnY2FxeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjM1NTAsImV4cCI6MjA4NjAzOTU1MH0.C_GLCdO2YjmHMz4UAnSnMxMIjVVwIO8I3tVFGrgBSZc",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "barangay-service-auth",
    },
  },
);

// Centralized API Configuration
export const API_CONFIG = {
  SERVER_API_URL: "http://localhost:3000",
};

export default supabase;

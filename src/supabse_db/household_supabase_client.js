import { createClient } from "@supabase/supabase-js";

const household_supabase = createClient(
  "https://tqcjrhrjykisuldsxwye.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY2pyaHJqeWtpc3VsZHN4d3llIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjYyODg2MiwiZXhwIjoyMDg4MjA0ODYyfQ.3uM-nbsropLc-CdpVHMehWfML0OsxMrqakKo2XmLd0I",
);

export default household_supabase;

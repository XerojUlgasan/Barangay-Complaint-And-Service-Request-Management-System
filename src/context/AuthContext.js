import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabse_db/supabase_client";
import { getOfficialProfile } from "../supabse_db/profile/profile";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Barangay User");
  const [userRole, setUserRole] = useState(null); // 'superadmin', 'official', or null
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      try {
        if (mounted) setUserLoading(true);

        // Get current user
        const userResp = await supabase.auth.getUser();
        const user = userResp.data?.user;

        if (!user) {
          // No user logged in
          if (mounted) {
            setUserName("Barangay User");
            setUserRole(null);
          }
          // Redirect to homepage if not on public pages
          const currentPath = window.location.pathname;
          if (
            !currentPath.includes("/homepage") &&
            !currentPath.includes("/login") &&
            currentPath !== "/"
          ) {
            navigate("/login", { replace: true });
          }
          return;
        }

        // Check if user is superadmin
        const { data: superadminData } = await supabase
          .from("superadmin_tbl")
          .select("id")
          .eq("auth_uid", user.id);

        if (superadminData && superadminData.length > 0) {
          if (mounted) setUserRole("superadmin");
          // Get superadmin name from profile if available
          const profileRes = await getOfficialProfile();
          if (profileRes && profileRes.success && profileRes.data) {
            const p = profileRes.data;
            const full = [p.firstname, p.middlename, p.lastname]
              .filter(Boolean)
              .join(" ");
            if (full && mounted) {
              setUserName(full);
              return;
            }
          }
          const fallback =
            user.user_metadata?.full_name || user.email || user.id;
          if (mounted) setUserName(fallback || "Barangay Admin");
          return;
        }

        // Check if user is official
        const { data: officialData } = await supabase
          .from("official_tbl")
          .select("id")
          .eq("auth_uid", user.id);

        if (officialData && officialData.length > 0) {
          if (mounted) setUserRole("official");
        }

        // Get official profile
        const profileRes = await getOfficialProfile();
        if (profileRes && profileRes.success && profileRes.data) {
          const p = profileRes.data;
          const full = [p.firstname, p.middlename, p.lastname]
            .filter(Boolean)
            .join(" ");
          if (full && mounted) {
            setUserName(full);
            return;
          }
        }

        // Fallback to auth user info
        const fallback = user.user_metadata?.full_name || user.email || user.id;
        if (mounted) setUserName(fallback || "Barangay User");

        // Redirect user to dashboard on login if they're not on a public page
        const currentPath = window.location.pathname;
        if (
          currentPath === "/" ||
          currentPath === "/login" ||
          currentPath === "/homepage"
        ) {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };

    // Initial load
    loadUserData();

    // Subscribe to auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      loadUserData();
    });

    return () => {
      mounted = false;
      if (
        data &&
        data.subscription &&
        typeof data.subscription.unsubscribe === "function"
      ) {
        data.subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const value = {
    userName,
    userRole,
    userLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

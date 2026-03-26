import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabse_db/supabase_client";
import { getOfficialProfile } from "../supabse_db/profile/profile";
import {
  clearResidentCache,
  formatResidentFullName,
  getResidentByAuthUid,
} from "../supabse_db/resident/resident";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const lastLoadedUidRef = useRef(null);
  const [authUser, setAuthUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [userName, setUserName] = useState("Barangay User");
  const [userRole, setUserRole] = useState(null); // 'superadmin', 'official', or null
  const [userLoading, setUserLoading] = useState(true);
  const [residentLoading, setResidentLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleSignOut = () => {
      if (!mounted) return;
      lastLoadedUidRef.current = null;
      setAuthUser(null);
      setResident(null);
      setUserName("Barangay User");
      setUserRole(null);
      setResidentLoading(false);
      setUserLoading(false);
      clearResidentCache();
      const currentPath = window.location.pathname;
      if (
        !currentPath.includes("/homepage") &&
        !currentPath.includes("/login") &&
        currentPath !== "/"
      ) {
        navigate("/login", { replace: true });
      }
    };

    const loadFullUserData = async (user) => {
      if (!mounted) return;
      setUserLoading(true);
      setResidentLoading(true);

      try {
        if (mounted) setAuthUser(user);

        // Fetch resident record once per sign-in
        const residentResult = await getResidentByAuthUid(user.id);
        const residentFullName =
          residentResult.success && residentResult.data
            ? formatResidentFullName(residentResult.data)
            : "";

        if (mounted) {
          setResident(
            residentResult.success ? residentResult.data || null : null,
          );
          setResidentLoading(false);
        }

        if (residentFullName && mounted) {
          setUserName(residentFullName);
        }

        // Check if user is superadmin
        const { data: superadminData } = await supabase
          .from("superadmin_tbl")
          .select("id")
          .eq("auth_uid", user.id);

        if (superadminData && superadminData.length > 0) {
          if (mounted) setUserRole("superadmin");
          try {
            const profileRes = await getOfficialProfile(user.id);
            if (profileRes?.success && profileRes.data) {
              const p = profileRes.data;
              const full = [p.firstname, p.lastname]
                .filter(Boolean)
                .join(" ");
              if (full && mounted) {
                setUserName(full);
                if (mounted) setUserLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn("Error fetching admin profile:", e);
          }
          const fallback =
            user.user_metadata?.full_name || user.email || user.id;
          if (mounted) setUserName(fallback || "Barangay Admin");
          if (mounted) setUserLoading(false);
          return;
        }

        // Check if user is official
        const { data: officialData } = await supabase
          .from("official_tbl")
          .select("id")
          .eq("auth_uid", user.id);

        if (officialData && officialData.length > 0) {
          if (mounted) setUserRole("official");
          try {
            const profileRes = await getOfficialProfile(user.id);
            if (profileRes?.success && profileRes.data) {
              const p = profileRes.data;
              const full = [p.firstname, p.lastname]
                .filter(Boolean)
                .join(" ");
              if (full && mounted) {
                setUserName(full);
              }
            }
          } catch (e) {
            console.warn("Error fetching official profile:", e);
          }
          // Ensure loading is set to false before returning
          if (mounted) setUserLoading(false);
          // Role is already set to "official", redirect and stop here
          const currentPath = window.location.pathname;
          if (
            currentPath === "/" ||
            currentPath === "/login" ||
            currentPath === "/homepage"
          ) {
            navigate("/dashboard", { replace: true });
          }
          return;
        }

        // Plain resident
        if (mounted) setUserRole("resident");
        if (!residentFullName) {
          const fallback =
            user.user_metadata?.full_name || user.email || user.id;
          if (mounted) setUserName(fallback || "Barangay User");
        }

        if (mounted) setUserLoading(false);

        // Redirect to dashboard if arriving from a public page
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
        if (mounted) setResidentLoading(false);
        if (mounted) setUserLoading(false);
      }
    };

    // Single source of truth: onAuthStateChange handles initial load and all
    // subsequent auth events. No manual getUser() call needed — INITIAL_SESSION
    // fires immediately on subscription setup with the current session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        handleSignOut();
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // JWT silently refreshed — user/role/resident haven't changed,
        // just keep the authUser object up to date.
        if (session?.user && mounted) setAuthUser(session.user);
        return;
      }

      // INITIAL_SESSION, SIGNED_IN, USER_UPDATED
      if (session?.user) {
        // Supabase can fire both INITIAL_SESSION and SIGNED_IN back-to-back
        // for the same user on page load. Skip if we already loaded this user.
        if (lastLoadedUidRef.current === session.user.id) return;
        lastLoadedUidRef.current = session.user.id;
        loadFullUserData(session.user);
      } else {
        // INITIAL_SESSION with no session = not logged in
        handleSignOut();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const value = {
    authUser,
    resident,
    residentLoading,
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

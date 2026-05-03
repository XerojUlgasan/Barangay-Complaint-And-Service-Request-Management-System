import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabse_db/supabase_client";
import { clearResidentCache } from "../supabse_db/resident/resident";

const getPhilippineDateKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const getOfficialAccessMessage = (status) => {
  if (status === "timed_out") {
    return "You have been timed out for today. Please contact the administrator if you need access.";
  }
  if (status === "not_present") {
    return "You have no attendance record for today. Please check in first.";
  }

  return "Unable to verify your attendance status right now.";
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const lastLoadedUidRef = useRef(null);
  const [authUser, setAuthUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [userName, setUserName] = useState("Barangay User");
  const [userPosition, setUserPosition] = useState("");
  const [userRole, setUserRole] = useState(null); // 'superadmin', 'official', or null
  const [userLoading, setUserLoading] = useState(true);
  const [residentLoading, setResidentLoading] = useState(true);
  const [officialAccessStatus, setOfficialAccessStatus] = useState("idle");
  const [officialAccessMessage, setOfficialAccessMessage] = useState("");

  const resetOfficialAccessState = () => {
    setOfficialAccessStatus("idle");
    setOfficialAccessMessage("");
  };

  useEffect(() => {
    let mounted = true;

    const handleSignOut = () => {
      if (!mounted) return;
      lastLoadedUidRef.current = null;
      setAuthUser(null);
      setResident(null);
      setUserName("Barangay User");
      setUserPosition("");
      setUserRole(null);
      setResidentLoading(false);
      setUserLoading(false);
      resetOfficialAccessState();
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

        const metadataFullName =
          user.user_metadata?.fullname || user.user_metadata?.full_name || "";
        const metadataPosition = user.user_metadata?.position || "";
        const metadataRole = (user.app_metadata?.role || "").toLowerCase();

        if (metadataRole === "official") {
          if (mounted) {
            setUserRole("official");
            setResident(null);
            setResidentLoading(false);
            setUserPosition(metadataPosition);
            setUserName(metadataFullName || user.email || "Barangay Official");
            setUserLoading(false);
            setOfficialAccessStatus("checking");
            setOfficialAccessMessage("");
          }

          const { data: officialRow, error: officialRowError } = await supabase
            .from("barangay_officials")
            .select("official_id")
            .eq("uid", user.id)
            .maybeSingle();

          if (officialRowError) {
            console.error("Error loading official profile:", officialRowError);
            if (mounted) {
              setOfficialAccessStatus("locked");
              setOfficialAccessMessage(getOfficialAccessMessage("error"));
            }
            return;
          }

          if (officialRow?.official_id) {
            const todayKey = getPhilippineDateKey();
            const { data: attendanceRow, error: attendanceError } = await supabase
              .from("attendance_records")
              .select("attendance_id, time_in, time_out, attendance_status")
              .eq("official_id", officialRow.official_id)
              .eq("attendance_date", todayKey)
              .maybeSingle();

            if (attendanceError) {
              console.error("Error loading attendance record:", attendanceError);
              if (mounted) {
                setOfficialAccessStatus("locked");
                setOfficialAccessMessage(getOfficialAccessMessage("error"));
              }
              return;
            }

            // Block access if no attendance record OR already timed out
            if (!attendanceRow || attendanceRow?.time_out) {
              if (mounted) {
                const reason = !attendanceRow ? "not_present" : "timed_out";
                setOfficialAccessStatus("locked");
                setOfficialAccessMessage(getOfficialAccessMessage(reason));
              }
              return;
            }
          }

          if (mounted) {
            resetOfficialAccessState();
          }
          // Role is already set to "official", redirect and stop here
          const currentPath = window.location.pathname;
          if (
            currentPath === "/" ||
            currentPath === "/login" ||
            currentPath === "/homepage"
          ) {
            navigate("/BarangayOfficial", { replace: true });
          }
          return;
        }

        if (metadataRole === "resident") {
          if (mounted) {
            setUserRole("resident");
            setResident(null);
            setResidentLoading(false);
            setUserPosition("");
            setUserName(
              metadataFullName || user.email || user.id || "Barangay User",
            );
            setUserLoading(false);
            resetOfficialAccessState();
          }

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

        const { data: superadminData, error: superadminError } = await supabase
          .from("superadmin_tbl")
          .select("id")
          .eq("auth_uid", user.id)
          .maybeSingle();

        if (superadminError) {
          console.error("Error checking superadmin access:", superadminError);
        }

        if (superadminData?.id) {
          if (mounted) {
            setUserRole("superadmin");
            setResident(null);
            setResidentLoading(false);
            setUserPosition("");
            setUserName(
              metadataFullName || user.email || user.id || "Barangay Admin",
            );
            setUserLoading(false);
            resetOfficialAccessState();
          }
          return;
        }

        if (mounted) {
          setResident(null);
          setResidentLoading(false);
          setUserLoading(false);
          resetOfficialAccessState();
        }

        await supabase.auth.signOut();
        handleSignOut();
      } catch (err) {
        console.error("Error loading user data:", err);
        if (mounted) setResidentLoading(false);
        if (mounted) setUserLoading(false);
        if (mounted) resetOfficialAccessState();
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
    userPosition,
    userRole,
    userLoading,
    officialAccessStatus,
    officialAccessMessage,
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

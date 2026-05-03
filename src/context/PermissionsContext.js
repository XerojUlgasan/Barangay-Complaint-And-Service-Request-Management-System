import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supabse_db/supabase_client";

const PermissionsContext = createContext();

export function PermissionsProvider({ children, userRole, authUser }) {
  const [permissions, setPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState(null);

  useEffect(() => {
    const loadPermissions = async () => {
      // Only fetch permissions for officials
      if (userRole !== "official" || !authUser?.id) {
        setPermissions({
          read_req: false,
          edit_req: false,
          read_comp: false,
          edit_comp: false,
          read_sett: false,
          create_sett: false,
          update_sett: false,
        });
        setPermissionsLoading(false);
        return;
      }

      try {
        setPermissionsLoading(true);
        const { data, error } = await supabase
          .from("official_access_control")
          .select(
            "read_req, edit_req, read_comp, edit_comp, read_sett, create_sett, update_sett",
          )
          .eq("auth_uid", authUser.id)
          .single();

        if (error) {
          // No record found or error - deny all access
          setPermissions({
            read_req: false,
            edit_req: false,
            read_comp: false,
            edit_comp: false,
            read_sett: false,
            create_sett: false,
            update_sett: false,
          });
          setPermissionsError(error.message);
        } else if (data) {
          setPermissions(data);
        } else {
          // No data returned - deny all access
          setPermissions({
            read_req: false,
            edit_req: false,
            read_comp: false,
            edit_comp: false,
            read_sett: false,
            create_sett: false,
            update_sett: false,
          });
        }
      } catch (err) {
        console.error("Failed to load permissions:", err);
        setPermissionsError(err.message);
        // Deny all on error
        setPermissions({
          read_req: false,
          edit_req: false,
          read_comp: false,
          edit_comp: false,
          read_sett: false,
          create_sett: false,
          update_sett: false,
        });
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadPermissions();
  }, [userRole, authUser?.id]);

  return (
    <PermissionsContext.Provider
      value={{ permissions, permissionsLoading, permissionsError }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return context;
}

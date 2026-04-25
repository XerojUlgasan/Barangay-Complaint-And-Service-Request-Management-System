import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// TODO: Sanitize user inputs for security

import { logout } from "./supabse_db/auth/auth";
import { AuthProvider, useAuth } from "./context/AuthContext";

// --- Shared Layout (Official/Admin) ---
import Layout from "./components/Layout";
import ResidentLayout from "./components/ResidentLayout";
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Users,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

// --- Public / User-facing pages ---
import Homepage from "./pages/guest/Home";
import Login from "./pages/guest/Login";
import ForgotPassword from "./pages/guest/ForgotPassword";
import UserLanding from "./pages/resident/ResidentDashboard";
import SubmitRequest from "./pages/resident/SubmitRequest";
import MyRequest from "./pages/resident/ResidentRequests";
import MyComplaints from "./pages/resident/ResidentComplaints";
import Announcements from "./pages/resident/ResidentAnnouncements";
import ResidentSettlements from "./pages/resident/ResidentSettlements";

// --- Official pages ---
import OfficialDashboard from "./pages/official/OfficialDashboard";
import OfficialRequests from "./pages/official/OfficialRequests";
import OfficialComplaints from "./pages/official/OfficialComplaints";
import OfficialAnnouncements from "./pages/official/OfficialAnnouncements";
import OfficialMediation from "./pages/official/OfficialMediation";
import OfficialConciliation from "./pages/official/OfficialConciliation";

// --- Admin pages ---
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminUsers from "./pages/admin/AdminUsers";

//test
import Home from "./pages/home";

// Demo placeholder
function UserPage() {
  return <div>User page (demo)</div>;
}

// Routes component that uses auth context
function AppRoutes() {
  const { userName, userPosition, userRole, userLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Homepage />} />
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* USER ROUTES - Requires authentication */}
      <Route
        path="/dashboard"
        element={
          <ResidentLayout>
            <UserLanding />
          </ResidentLayout>
        }
      />
      <Route
        path="/requests"
        element={
          <ResidentLayout>
            <MyRequest />
          </ResidentLayout>
        }
      />
      <Route
        path="/complaints"
        element={
          <ResidentLayout>
            <MyComplaints />
          </ResidentLayout>
        }
      />
      <Route
        path="/announcements"
        element={
          <ResidentLayout>
            <Announcements />
          </ResidentLayout>
        }
      />
      <Route
        path="/my-settlements"
        element={
          <ResidentLayout>
            <ResidentSettlements />
          </ResidentLayout>
        }
      />
      <Route
        path="/submit"
        element={
          <ResidentLayout>
            <SubmitRequest />
          </ResidentLayout>
        }
      />
      <Route
        path="/submit/certificate"
        element={
          <ResidentLayout>
            <SubmitRequest />
          </ResidentLayout>
        }
      />
      <Route
        path="/submit/complaint"
        element={
          <ResidentLayout>
            <SubmitRequest />
          </ResidentLayout>
        }
      />
      <Route path="/user" element={<UserPage />} />
      <Route path="/testingan" element={<Home />} />

      {/* OFFICIAL PORTAL ROUTES */}
      <Route
        path="/BarangayOfficial"
        element={
          <Layout
            menuItems={[
              {
                path: "/BarangayOfficial",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
                end: true,
              },
              {
                path: "/BarangayOfficial/announcements",
                label: "Announcements",
                icon: <Megaphone size={18} />,
              },
              {
                path: "/BarangayOfficial/requests",
                label: "Requests",
                icon: <FileText size={18} />,
              },
              {
                path: "/BarangayOfficial/complaints",
                label: "Complaints",
                icon: <Megaphone size={18} />,
              },
              {
                section: "Amicable Settlements",
                path: "/BarangayOfficial/amicable-settlements/mediation",
                label: "Mediation",
                icon: <MessageSquare size={18} />,
              },
              {
                section: "Amicable Settlements",
                path: "/BarangayOfficial/amicable-settlements/conciliation",
                label: "Conciliation",
                icon: <MessageSquare size={18} />,
              },
            ]}
            userName={userName}
            userPosition={userPosition}
            userRole={userRole}
            userLoading={userLoading}
            onLogout={handleLogout}
          />
        }
      >
        <Route index element={<OfficialDashboard />} />
        <Route path="announcements" element={<OfficialAnnouncements />} />
        <Route path="requests" element={<OfficialRequests />} />
        <Route path="complaints" element={<OfficialComplaints />} />
        <Route
          path="amicable-settlements/mediation"
          element={<OfficialMediation />}
        />
        <Route
          path="amicable-settlements/conciliation"
          element={<OfficialConciliation />}
        />
      </Route>

      {/* ADMIN PORTAL ROUTES */}
      <Route
        path="/BarangayAdmin"
        element={
          <Layout
            menuItems={[
              {
                path: "/BarangayAdmin",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
                end: true,
              },
              {
                path: "/BarangayAdmin/announcements",
                label: "Announcements",
                icon: <Megaphone size={18} />,
              },
              {
                path: "/BarangayAdmin/requests",
                label: "Requests",
                icon: <FileText size={18} />,
              },
              {
                path: "/BarangayAdmin/complaints",
                label: "Complaints",
                icon: <AlertCircle size={18} />,
              },
              {
                path: "/BarangayAdmin/users",
                label: "Users",
                icon: <Users size={18} />,
              },
            ]}
            userName={userName}
            userPosition={userPosition}
            userRole={userRole}
            userLoading={userLoading}
            onLogout={handleLogout}
          />
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* FALLBACK - Old Admin Portal */}
      <Route
        path="/BarangayAdmin-old"
        element={
          <Layout
            menuItems={[
              {
                path: "/BarangayAdmin",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
                end: true,
              },
              {
                path: "/BarangayAdmin/announcements",
                label: "Announcements",
                icon: <Megaphone size={18} />,
              },
              {
                path: "/BarangayAdmin/requests",
                label: "Requests",
                icon: <FileText size={18} />,
              },
              {
                path: "/BarangayAdmin/complaints",
                label: "Complaints",
                icon: <AlertCircle size={18} />,
              },
              {
                path: "/BarangayAdmin/users",
                label: "Users",
                icon: <Users size={18} />,
              },
            ]}
            userName={userName}
            userPosition={userPosition}
            userLoading={userLoading}
            onLogout={handleLogout}
          />
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

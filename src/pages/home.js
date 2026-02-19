import supabase from "../supabse_db/supabase_client";

import {
  postAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} from "../supabse_db/announcement/announcement";

import {
  checkHouseholdMember,
  loginByEmail,
  logout,
  registerByEmail,
  checkUserRole,
} from "../supabse_db/auth/auth";

import {
  insertComplaint,
  getComplaints,
  getComplaintById,
  deleteComplaint,
  getComplaintHistory,
} from "../supabse_db/complaint/complaint";

import {
  insertRequest,
  getRequests,
  getRequestById,
  deleteRequest,
  getRequestHistory,
} from "../supabse_db/request/request";

import {
    getAllOfficials,
    getOfficialById,
    getAllResidents,
    getResidentById
  } from "../supabse_db/superadmin/superadmin";     

import {
    getOfficialProfile,
    getResidentProfile,
} from "../supabse_db/profile/profile";

import {
  getAssignedComplaints,
  getAssignedRequests,
  updateComplaintStatus,
  updateRequestStatus,

} from "../supabse_db/official/official";

const Home = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        rowGap: "8px",
        padding: "20px",
      }}
    >
      <h2>AUTH</h2>
      <button
        onClick={() =>
          checkHouseholdMember(
            "3b2b511a-c293-4263-b967-7ef08078be81",
            "agustin",
            "ernesto",
            "cruz",
            "2004-01-01",
          )
        }
      >
        Check Household GOODS
      </button>
      <button
        onClick={() =>
          registerByEmail("agustinernestocruz@gmail.com", "password123")
        }
      >
        Register Email GOODS
      </button>
      <button
        onClick={() => loginByEmail("xeroj1342@gmail.com", "password123")}
      >
        LOGIN BY SUPER ADMIN
      </button>

      <button
        onClick={() => loginByEmail("xerojulgasan@gmail.com", "password123")}
      >
        Login by official
      </button>

      <button onClick={() => loginByEmail("asd@gmail.com", "password123")}>
        Login by official2
      </button>

      <button
        onClick={() =>
          loginByEmail("agustinernestocruz@gmail.com", "password123")
        }
      >
        Login by resident
      </button>
      <button onClick={() => loginByEmail("prominenplayz@gmail.com", "qwe123")}>
        Login by resident2
      </button>
      <button
        onClick={async () => {
          console.log("CHECK USER ROLE BUTTON CLICKED");

          // 1. Get current user
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(); // <-- fix typo here

          console.log("CURRENT USER:", user);
          console.log("GET USER ERROR:", error);

          if (!user) {
            console.log("No user logged in");
            return;
          }

          // 2. Pass user.id to your function
          const result = await checkUserRole(user.id);

          console.log("Check user role:", result);
        }}
      >
        Check User Role
      </button>

      <button onClick={() => logout()}>Logout</button>
      <h2>PROFILE</h2>
      <button
        onClick={async () => {
          const result = await getOfficialProfile();
          console.log("GET OFFICIAL PROFILE:", result);
        }}
      >
        Get Official Profile GOODS 
      </button>
            <button
        onClick={async () => {
          const result = await getResidentProfile();
          console.log("GET RESIDENT PROFILE:", result);
        }}
      >
        Get Resident Profile
      </button>

      <h2>COMPLAINTS</h2>
      <button 
        onClick={async () => {
          const result = await insertComplaint(
            "Noise",
            "2026-02-13T08:00:00.000Z",
            "Lamao",
            "Loud music at night",
          );
          console.log("INSERT COMPLAINT:", result);
        }}
      >
        Insert Complaint{" "}
        <font color="green">
          <b>GOODS</b>
        </font>
      </button>
      <button
        onClick={async () => {
          const result = await getComplaints();
          console.log("GET COMPLAINTS:", result);
        }}
      >
        Get Complaints GOODS <font color="red"><b>-kulang superadmin</b></font>
      </button>
      <button
        onClick={async () => {
          const result = await getComplaintById(44);
          console.log("GET COMPLAINT BY ID:", result);
        }}
      >
        Get Complaint #1 GOODS <font color="red"><b>-kulang superadmin</b></font>
      </button>
      <button
        onClick={async () => {
          const result = await deleteComplaint(44);
          console.log("DELETE COMPLAINT:", result);
        }}
      >
        Delete Complaint #1 GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getComplaintHistory(44);
          console.log("GET COMPLAINT HISTORY:", result);
        }}
      >
        Get Complaint #1 History GOODS <font color="red"><b>-kulang superadmin</b></font>
      </button>

      <h2>REQUESTS</h2>
      <button
        onClick={async () => {
          const result = await insertRequest(
            "Barangay Certificate",
            "Need certificate for employment",
            "Employment",
          );
          console.log("INSERT REQUEST:", result);
        }}
      >
        Insert Request GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getRequests();
          console.log("GET REQUESTS:", result);
        }}
      >
        Get Requests GOODS <font color="red"><b>-kulang superadmin</b></font> 
      </button>
      <button
        onClick={async () => {
          const result = await getRequestById(47);
          console.log("GET REQUEST BY ID:", result);
        }}
      >
        Get Request #1 GOODS <font color="red"><b>-kulang superadmin</b></font>
      </button>
      <button
        onClick={async () => {
          const result = await deleteRequest(47);
          console.log("DELETE REQUEST:", result);
        }}
      >
        Delete Request #1 GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getRequestHistory(35);
          console.log("GET REQUEST HISTORY:", result);
        }}
      >
        Get Request #1 History GOODS <font color="red"><b>-kulang superadmin</b></font>
      </button>

      <h2>OFFICIALS</h2>
      <button
        onClick={async () => {
          const result = await getAssignedComplaints();
          console.log("GET ASSIGNED COMPLAINTS:", result);
        }}
      >
        Get Assigned Complaints GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getAssignedRequests();
          console.log("GET ASSIGNED REQUESTS:", result);
        }}
      >
        Get Assigned Requests GOODS
      </button>
            <button
        onClick={async () => {
          const result = await updateComplaintStatus(
            44,
            "resolved",
            "Issue resolved",
            "low",
          );
          console.log("UPDATE COMPLAINT STATUS:", result);
        }}
      >
        Update Complaint #1 Status GOODS<font color="red"><b>-TODO sa database: add status enum</b></font>
      </button>
              <button
        onClick={async () => {
          const result = await updateRequestStatus(
            35,
            "completed",
            "Approved by official",
          );
          console.log("UPDATE REQUEST STATUS:", result);
        }}
      >
        Update Request #1 Status GOODS
      </button>

        <h2>SUPERADMIN</h2>
              <button
        onClick={async () => {
          const result = await getAllOfficials();
          console.log("GET ALL OFFICIALS:", result);
        }}
      >
        Get All Officials GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getOfficialById("f3409e4a-91f0-4a77-bb1c-64a8dba4ec5d");  
          console.log("GET OFFICIAL BY ID:", result);
        }}
      >
        Get Official #1 GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getAllResidents();
          console.log("GET ALL RESIDENTS:", result);
        }}
      >
        Get All Residents GOODS 
      </button>
      <button
        onClick={async () => {
          const result = await getResidentById(1);
          console.log("GET RESIDENT BY ID:", result);
        }}
      >
        Get Resident #1 GOODS
      </button>

            <h2>ANNOUNCEMENTS</h2>
      <button
        onClick={async () => {
          const result = await postAnnouncement(
            "general",
            "high",
            "Test Title",
            "Test Content",
          );
          console.log("POST ANNOUNCEMENT:", result);
        }}
      >
        Post Announcement GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getAnnouncements();
          console.log("GET ANNOUNCEMENTS:", result);
        }}
      >
        Get Announcements GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getAnnouncementById(1368);
          console.log("GET ANNOUNCEMENT #1:", result);
        }}
      >
        Get Announcement #1 GOODS
      </button>

        <button
        onClick={async () => {
          const result = await updateAnnouncement(
            1368,
            "general",
            "high",
            "Updated Title",
            "Updated Content",
          );
          console.log("UPDATE ANNOUNCEMENT:", result);
        }}
      >
        Update Announcement #1 
      </button>
      <button
        onClick={async () => {
          const result = await deleteAnnouncement(1368);
          console.log("DELETE ANNOUNCEMENT:", result);
        }}
      >
        Delete Announcement #1 
      </button>

    </div>
  );
};

export default Home;

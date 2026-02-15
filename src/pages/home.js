import { 
  postAnnouncement, 
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
} from "../supabse_db/announcement/announcement";

import {
  checkHouseholdMember,
  loginByEmail,
  logout,
  registerByEmail,
} from "../supabse_db/auth/auth";

import {
  insertComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaintToOfficial,
  deleteComplaint,
  getComplaintHistory,
  insertComplaintHistory
} from "../supabse_db/complaint/complaint";

import {
  insertRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  assignRequestToOfficial,
  deleteRequest,
  getRequestHistory,
  insertRequestHistory
} from "../supabse_db/request/request";

import {
  getAllHouseholds,
  getHouseholdById,
  createHousehold,
  deleteHousehold,
  getAllHouseholdMembers,
  getHouseholdMembers,
  getHouseholdMemberById,
  addHouseholdMember,
  updateHouseholdMember,
  deleteHouseholdMember
} from "../supabse_db/household/household";

import {
  getOfficialProfile,
  getAllOfficials,
  getOfficialById,
  updateOfficialRole
} from "../supabse_db/official/official";

const Home = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", rowGap: "8px", padding: "20px" }}>
      <h2>AUTH</h2>
      <button onClick={() => checkHouseholdMember("3b2b511a-c293-4263-b967-7ef08078be81", "agustin", "ernesto", "cruz", "2004-01-01")}>
        Check Household
      </button>
      <button onClick={() => registerByEmail("agustinernestocruz@gmail.com", "password123")}>
        Register Email
      </button>
      <button onClick={() => loginByEmail("agustinernestocruz@gmail.com", "password123")}>
        Login
      </button>
      <button onClick={() => logout()}>
        Logout
      </button>

      <h2>COMPLAINTS</h2>
      <button onClick={async () => {
        const result = await insertComplaint("Noise", "2026-02-13T08:00:00.000Z", "Lamao", "Loud music at night");
        console.log("INSERT COMPLAINT:", result);
      }}>
        Insert Complaint
      </button>
      <button onClick={async () => {
        const result = await getComplaints();
        console.log("GET COMPLAINTS:", result);
      }}>
        Get Complaints
      </button>
      <button onClick={async () => {
        const result = await getComplaintById(1);
        console.log("GET COMPLAINT BY ID:", result);
      }}>
        Get Complaint #1
      </button>
      <button onClick={async () => {
        const result = await updateComplaintStatus(1, "resolved", "Issue resolved", "low");
        console.log("UPDATE COMPLAINT STATUS:", result);
      }}>
        Update Complaint #1 Status
      </button>
      <button onClick={async () => {
        const result = await assignComplaintToOfficial(1, "official-uuid-here");
        console.log("ASSIGN COMPLAINT:", result);
      }}>
        Assign Complaint #1
      </button>
      <button onClick={async () => {
        const result = await deleteComplaint(1);
        console.log("DELETE COMPLAINT:", result);
      }}>
        Delete Complaint #1
      </button>
      <button onClick={async () => {
        const result = await getComplaintHistory(1);
        console.log("GET COMPLAINT HISTORY:", result);
      }}>
        Get Complaint #1 History
      </button>
      <button onClick={async () => {
        const result = await insertComplaintHistory(1, "pending", "medium", "Initial submission");
        console.log("INSERT COMPLAINT HISTORY:", result);
      }}>
        Insert Complaint History
      </button>

      <h2>REQUESTS</h2>
      <button onClick={async () => {
        const result = await insertRequest("Barangay Certificate", "Need certificate for employment", "Employment");
        console.log("INSERT REQUEST:", result);
      }}>
        Insert Request
      </button>
      <button onClick={async () => {
        const result = await getRequests();
        console.log("GET REQUESTS:", result);
      }}>
        Get Requests
      </button>
      <button onClick={async () => {
        const result = await getRequestById(1);
        console.log("GET REQUEST BY ID:", result);
      }}>
        Get Request #1
      </button>
      <button onClick={async () => {
        const result = await updateRequestStatus(1, "approved", "Approved by official");
        console.log("UPDATE REQUEST STATUS:", result);
      }}>
        Update Request #1 Status
      </button>
      <button onClick={async () => {
        const result = await assignRequestToOfficial(1, "official-uuid-here");
        console.log("ASSIGN REQUEST:", result);
      }}>
        Assign Request #1
      </button>
      <button onClick={async () => {
        const result = await deleteRequest(1);
        console.log("DELETE REQUEST:", result);
      }}>
        Delete Request #1
      </button>
      <button onClick={async () => {
        const result = await getRequestHistory(1);
        console.log("GET REQUEST HISTORY:", result);
      }}>
        Get Request #1 History
      </button>
      <button onClick={async () => {
        const result = await insertRequestHistory(1, "approved", "Approved by official");
        console.log("INSERT REQUEST HISTORY:", result);
      }}>
        Insert Request History
      </button>

      <h2>ANNOUNCEMENTS</h2>
      <button onClick={async () => {
        const result = await postAnnouncement("general", "high", "Test Title", "Test Content");
        console.log("POST ANNOUNCEMENT:", result);
      }}>
        Post Announcement
      </button>
      <button onClick={async () => {
        const result = await getAnnouncements();
        console.log("GET ANNOUNCEMENTS:", result);
      }}>
        Get Announcements
      </button>
      <button onClick={async () => {
        const result = await getAnnouncementById(1);
        console.log("GET ANNOUNCEMENT #1:", result);
      }}>
        Get Announcement #1
      </button>

      <h2>HOUSEHOLDS</h2>
      <button onClick={async () => {
        const result = await getAllHouseholds();
        console.log("GET ALL HOUSEHOLDS:", result);
      }}>
        Get All Households
      </button>
      <button onClick={async () => {
        const result = await getHouseholdById("c49a9f80-aa2d-46b9-9907-fa0be37f7be3");
        console.log("GET HOUSEHOLD BY ID:", result);
      }}>
        Get Household by ID
      </button>
      <button onClick={async () => {
        const result = await createHousehold();
        console.log("CREATE HOUSEHOLD:", result);
      }}>
        Create Household
      </button>

      <h2>HOUSEHOLD MEMBERS</h2>
      <button onClick={async () => {
        const result = await getAllHouseholdMembers();
        console.log("GET ALL HOUSEHOLD MEMBERS:", result);
      }}>
        Get All Household Members
      </button>
      <button onClick={async () => {
        const result = await getHouseholdMembers("c49a9f80-aa2d-46b9-9907-fa0be37f7be3");
        console.log("GET HOUSEHOLD MEMBERS:", result);
      }}>
        Get Household Members by ID
      </button>
      <button onClick={async () => {
        const result = await getHouseholdMemberById("member-uuid-here");
        console.log("GET HOUSEHOLD MEMBER BY ID:", result);
      }}>
        Get Household Member by ID
      </button>

      <h2>OFFICIALS</h2>
      <button onClick={async () => {
        const result = await getOfficialProfile();
        console.log("GET OFFICIAL PROFILE:", result);
      }}>
        Get Official Profile
      </button>
      <button onClick={async () => {
        const result = await getAllOfficials();
        console.log("GET ALL OFFICIALS:", result);
      }}>
        Get All Officials
      </button>
    </div>
  );
};

export default Home;
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
} from "../supabse_db/auth/auth";

import {
  insertComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaintToOfficial,
  deleteComplaint,
  getComplaintHistory,
  insertComplaintHistory,
} from "../supabse_db/complaint/complaint";

import {
  insertRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  assignRequestToOfficial,
  deleteRequest,
  getRequestHistory,
  insertRequestHistory,
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
  deleteHouseholdMember,
} from "../supabse_db/household/household";

import {
  getOfficialProfile,
  getAllOfficials,
  getOfficialById,
  updateOfficialRole,
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
        Register Email check if user is already registered
      </button>
      <button
        onClick={() => loginByEmail("xeroj1342@gmail.com", "password123")}
      >
        LOGIN BY SUPER ADMIN
      </button>
      <button
        onClick={() => loginByEmail("xerojulgasan@gmail.com", "password123")}
      >
        Login by official NOT GOODS pero add another function to check role,
        call rpc gagawin ni xeroj may error, nag eedit yung household_member
        kapag nag lologin using an official account
      </button>
      <button
        onClick={() =>
          loginByEmail("agustinernestocruz@gmail.com", "password123")
        }
      >
        Login by resident
      </button>
      <button onClick={() => logout()}>Logout</button>

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
        Insert Complaint GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getComplaints();
          console.log("GET COMPLAINTS:", result);
        }}
      >
        Get Complaints GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getComplaintById(14);
          console.log("GET COMPLAINT BY ID:", result);
        }}
      >
        Get Complaint #1 GOODS
      </button>
      <button
        onClick={async () => {
          const result = await updateComplaintStatus(
            20,
            "resolved",
            "Issue resolved",
            "low",
          );
          console.log("UPDATE COMPLAINT STATUS:", result);
        }}
      >
        Update Complaint #1 GOODS Status TODO : sa database: add status enum
      </button>
      <button
        onClick={async () => {
          const result = await assignComplaintToOfficial(
            14,
            "official-uuid-here",
          );
          console.log("ASSIGN COMPLAINT:", result);
        }}
      >
        Assign Complaint #1 TODO: ni xeroj sa backend, automatically
      </button>
      <button
        onClick={async () => {
          const result = await deleteComplaint(19);
          console.log("DELETE COMPLAINT:", result);
        }}
      >
        Delete Complaint (GOODS: ONLY RESIDENT WHO WONS THE COMPLAINT CAN DELETE
        THE COMPLAINT)
      </button>
      <button
        onClick={async () => {
          const result = await getComplaintHistory(20);
          console.log("GET COMPLAINT HISTORY:", result);
        }}
      >
        Get Complaint History (GOODS)
      </button>
      <button
        onClick={async () => {
          const result = await insertComplaintHistory(
            1,
            "pending",
            "medium",
            "Initial submission",
          );
          console.log("INSERT COMPLAINT HISTORY:", result);
        }}
      >
        Insert Complaint History NOT GOODS (AALISIN SINCE AUTOMATIC)
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
        Get Requests GOODS BY RESIDENT, OFFICIAL CANNOT SEE IT'S ASSIGNED
        REQUESTS (NEED DEDICATED FUNCTION FOR GETTING ASSIGNED REQUEST TO
        OFFICAL)
      </button>
      <button
        onClick={async () => {
          const result = await getRequestById(6);
          console.log("GET REQUEST BY ID:", result);
        }}
      >
        Get Request #1 GOODS ADJUSTMENTS (NEEDS DEDICATED FUNCTION FOR OFFICIAL)
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
        Update Request GOODS
      </button>
      <button
        onClick={async () => {
          const result = await assignRequestToOfficial(1, "official-uuid-here");
          console.log("ASSIGN REQUEST:", result);
        }}
      >
        Assign Request #1 REMOVE (AUTOMATIC ASSIGNED BY XEROJ) TODO : BY XEROJ
      </button>
      <button
        onClick={async () => {
          const result = await deleteRequest(6);
          console.log("DELETE REQUEST:", result);
        }}
      >
        Delete Request GOODS (ONLY OWNER CAN DELETE)
      </button>
      <button
        onClick={async () => {
          const result = await getRequestHistory(35);
          console.log("GET REQUEST HISTORY:", result);
        }}
      >
        Get Request #1 History GOODS
      </button>
      <button
        onClick={async () => {
          const result = await insertRequestHistory(
            1,
            "approved",
            "Approved by official",
          );
          console.log("INSERT REQUEST HISTORY:", result);
        }}
      >
        Insert Request History NOT GOODS, REMOVED (AUTOMATICALLY upDATES hISTORY
        ON CHANGE) TODO : DIX BY XEROJ
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
          const result = await getAnnouncementById(1363);
          console.log("GET ANNOUNCEMENT #1:", result);
        }}
      >
        Get Announcement #1 GOODS
      </button>

      <h2>HOUSEHOLDS</h2>
      <button
        onClick={async () => {
          const result = await getAllHouseholds();
          console.log("GET ALL HOUSEHOLDS:", result);
        }}
      >
        Get All Households GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getHouseholdById(
            "f09c62c5-5dc1-4eab-87a1-3e74dc7fbc81",
          );
          console.log("GET HOUSEHOLD BY ID:", result);
        }}
      >
        Get Household by ID GOODS
      </button>
      <button
        onClick={async () => {
          const result = await createHousehold();
          console.log("CREATE HOUSEHOLD:", result);
        }}
      >
        Create Household GOODS
      </button>

      <h2>HOUSEHOLD MEMBERS</h2>
      <button
        onClick={async () => {
          const result = await getAllHouseholdMembers();
          console.log("GET ALL HOUSEHOLD MEMBERS:", result);
        }}
      >
        Get All Household Members GOODS
      </button>
      <button
        onClick={async () => {
          const result = await getHouseholdMembers(
            "f09c62c5-5dc1-4eab-87a1-3e74dc7fbc81",
          );
          console.log("GET HOUSEHOLD MEMBERS:", result);
        }}
      >
        Get Household by ID NO ACCESS (MAYBR DUE TO RLS)
      </button>
      <button
        onClick={async () => {
          const result = await getHouseholdMemberById(
            "e3d38c4e-81fa-4213-b742-54f2b26c804c",
          );
          console.log("GET HOUSEHOLD MEMBER BY ID:", result);
        }}
      >
        Get Household Member by ID GOODS PERO BAKIT WALANG ACCESS (MAYBE SA RLS)
        TODO BY XEOJ
      </button>

      <h2>OFFICIALS</h2>
      <button
        onClick={async () => {
          const result = await getOfficialProfile();
          console.log("GET OFFICIAL PROFILE:", result);
        }}
      >
        Get Official Profile GOODS OERO USING OFFICAL PROFILE NUNG NAKA LOGIN
        LANG ADD (IF SUPER ADMIN, DAPAT GET SPECIFIC OFFICIAL USING ID)
      </button>
      <button
        onClick={async () => {
          const result = await getAllOfficials();
          console.log("GET ALL OFFICIALS:", result);
        }}
      >
        Get All Officials GOODS
      </button>
    </div>
  );
};

export default Home;

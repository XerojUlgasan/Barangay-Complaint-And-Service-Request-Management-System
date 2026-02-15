import { 
  postAnnouncement, 
  getAnnouncements
} from "../supabse_db/announcement/announcement";

import {
  checkHouseholdMember,
  loginByEmail,
  logout,
  registerByEmail,
} from "../supabse_db/auth/auth";

import {
  insertComplaint,
  getComplaints
} from "../supabse_db/user/user";

import {
  insertRequest,
  getRequests
} from "../supabse_db/user/user";

import {
  getAllHouseholds
} from "../supabse_db/household/household";

import {
  getOfficialProfile
} from "../supabse_db/official/official";

import {
  getCurrentUserProfile
} from "../supabse_db/user/user";

const Home = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", rowGap: "8px", padding: "20px" }}>
      <h2>AUTH</h2>
      <button onClick={() => checkHouseholdMember("c49a9f80-aa2d-46b9-9907-fa0be37f7be3", "xeroj", "ulgasan", "nilles", "2004-12-20")}>
        Check Household
      </button>
      <button onClick={() => registerByEmail("xerojulgasan@gmail.com", "password123")}>
        Register Email
      </button>
      <button onClick={() => loginByEmail("xerojulgasan@gmail.com", "password123")}>
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

      <h2>HOUSEHOLDS</h2>
      <button onClick={async () => {
        const result = await getAllHouseholds();
        console.log("GET ALL HOUSEHOLDS:", result);
      }}>
        Get All Households
      </button>

      <h2>OFFICIALS</h2>
      <button onClick={async () => {
        const result = await getOfficialProfile();
        console.log("GET OFFICIAL PROFILE:", result);
      }}>
        Get Official Profile
      </button>

      <h2>USERS</h2>
      <button onClick={async () => {
        const result = await getCurrentUserProfile();
        console.log("GET CURRENT USER PROFILE:", result);
      }}>
        Get Current User Profile
      </button>
    </div>
  );
};

export default Home;
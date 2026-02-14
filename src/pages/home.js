import { postAnnouncement } from "../supabse_db/announcement/post_announcement";
import {
  checkHouseholdMember,
  loginByEmail,
  logout,
  registerByEmail,
} from "../supabse_db/auth/auth";
import { insertComplaint, insertRequest } from "../supabse_db/user/user";

const Home = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        rowGap: "10px",
      }}
    >
      <button
        onClick={() =>
          checkHouseholdMember(
            "c49a9f80-aa2d-46b9-9907-fa0be37f7be3",
            "xeroj",
            "ulgasan",
            "nilles",
            "2004-12-20",
          )
        }
      >
        check household
      </button>

      <button
        onClick={() => registerByEmail("xerojulgasan@gmail.com", "password123")}
      >
        register email
      </button>

      <button
        onClick={() => loginByEmail("xerojulgasan@gmail.com", "password123")}
      >
        LOGIN
      </button>

      <button
        onClick={() =>
          insertComplaint("dasd", "2026-02-13T08:00:00.000Z", "Lamao", "ASDASD")
        }
      >
        CREATE COMPLAINT
      </button>

      <button onClick={() => insertRequest("amao", "adasda", "asdasd")}>
        CREATE REQUEST
      </button>
    </div>
  );
};

export default Home;

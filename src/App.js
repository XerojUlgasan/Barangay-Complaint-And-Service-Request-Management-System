import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

//TODO : sanitize iputss

import {
  checkHouseholdMember,
  checkUser,
  loginByEmail,
  logout,
  registerByEmail,
} from "./supabse_db/auth/auth";
import Home from "./pages/home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;

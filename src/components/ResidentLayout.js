import React from "react";
import ChatBot from "./ChatBot";

const ResidentLayout = ({ children }) => {
  return (
    <div className="resident-layout">
      {children}
      <ChatBot />
    </div>
  );
};

export default ResidentLayout;

import React from "react";
import Sidebar from "./Sidebar/Sidebar";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => (
  <div className="admin-layout">
    <Sidebar />
    <main className="admin-main">{children}</main>
  </div>
);

export default AdminLayout;

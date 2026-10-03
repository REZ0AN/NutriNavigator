import React, { useState } from "react";
import { MdClose, MdMenu } from "react-icons/md";
import Sidebar from "./Sidebar/Sidebar";
import "./AdminLayout.css";

const AdminLayout = ({ children, mainClassName = "" }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      {mobileOpen && <button type="button" className="admin-mobile-backdrop" aria-label="Close admin menu" onClick={() => setMobileOpen(false)} />}
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <main className={`admin-main ${mainClassName}`.trim()}>
        <div className="admin-mobile-header">
          <button type="button" aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <MdClose /> : <MdMenu />}
          </button>
          <span>NutriNavigator Admin</span>
        </div>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

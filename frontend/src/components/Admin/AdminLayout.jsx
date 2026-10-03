import React, { useState } from "react";
import { MdClose, MdMenu } from "react-icons/md";
import Sidebar from "./Sidebar/Sidebar";

const AdminLayout = ({ children, mainClassName = "" }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen items-stretch">
      {mobileOpen && <button type="button" className="fixed inset-0 z-[150] bg-black/40 md:hidden" aria-label="Close admin menu" onClick={() => setMobileOpen(false)} />}
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <main className={`min-h-screen min-w-0 flex-1 overflow-x-auto bg-admin-canvas p-4 md:p-8 ${mainClassName}`.trim()}>
        <div className="sticky top-0 z-40 -mx-4 -mt-4 mb-5 flex h-14 items-center gap-3 border-b border-admin-border bg-white px-4 font-body font-semibold text-brand-900 md:hidden">
          <button type="button" className="grid h-10 w-10 place-items-center text-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700" aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={() => setMobileOpen((open) => !open)}>
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

import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  MdDashboard, MdInventory, MdShoppingBag, MdPeople,
  MdStar, MdAdd, MdList, MdExpandMore, MdExpandLess, MdClose,
} from "react-icons/md";

const navClass = "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-body text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";
const subnavClass = "flex items-center gap-3 rounded-lg px-4 py-2 font-body text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

const Sidebar = ({ mobileOpen = false, onNavigate = () => {} }) => {
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <aside id="admin-navigation" className={`fixed inset-y-0 left-0 z-[160] flex h-screen w-[248px] shrink-0 flex-col overflow-y-auto bg-brand-900 transition-transform md:sticky md:top-0 md:z-auto md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <button type="button" className="absolute right-2.5 top-3 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-xl text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:hidden" aria-label="Close admin menu" onClick={onNavigate}><MdClose /></button>
      <Link to="/" className="flex flex-col gap-0.5 border-b border-white/10 px-5 py-6" onClick={onNavigate}>
        <span className="font-display text-lg leading-tight text-white">NutriNavigator</span>
        <small className="font-body text-xs uppercase tracking-widest text-brand-100">Admin Panel</small>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        <NavLink to="/admin/dashboard" onClick={onNavigate} className={({ isActive }) => `${navClass} ${isActive ? "bg-white/15 text-white" : ""}`}>
          <MdDashboard /> Dashboard
        </NavLink>

        <div>
          <button type="button" className={navClass} onClick={() => setProductsOpen((o) => !o)}>
            <MdInventory /> Products {productsOpen ? <MdExpandLess className="ml-auto" /> : <MdExpandMore className="ml-auto" />}
          </button>
          {productsOpen && (
            <div className="mt-0.5 flex flex-col gap-0.5 pl-5">
              <NavLink to="/admin/products" onClick={onNavigate} className={({ isActive }) => `${subnavClass} ${isActive ? "bg-white/10 text-brand-100" : ""}`}>
                <MdList /> All Products
              </NavLink>
              <NavLink to="/admin/product" onClick={onNavigate} className={({ isActive }) => `${subnavClass} ${isActive ? "bg-white/10 text-brand-100" : ""}`}>
                <MdAdd /> Create Product
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/admin/orders" onClick={onNavigate} className={({ isActive }) => `${navClass} ${isActive ? "bg-white/15 text-white" : ""}`}>
          <MdShoppingBag /> Orders
        </NavLink>

        <NavLink to="/admin/users" onClick={onNavigate} className={({ isActive }) => `${navClass} ${isActive ? "bg-white/15 text-white" : ""}`}>
          <MdPeople /> Users
        </NavLink>

        <NavLink to="/admin/reviews" onClick={onNavigate} className={({ isActive }) => `${navClass} ${isActive ? "bg-white/15 text-white" : ""}`}>
          <MdStar /> Reviews
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

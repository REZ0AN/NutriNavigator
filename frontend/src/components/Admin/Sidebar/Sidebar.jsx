import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  MdDashboard, MdInventory, MdShoppingBag, MdPeople,
  MdStar, MdAdd, MdList, MdExpandMore, MdExpandLess, MdClose,
} from "react-icons/md";
import "./Sidebar.css";

const Sidebar = ({ mobileOpen = false, onNavigate = () => {} }) => {
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <aside id="admin-navigation" className={`admin-sidebar ${mobileOpen ? "admin-sidebar--open" : ""}`}>
      <button type="button" className="admin-sidebar__close" aria-label="Close admin menu" onClick={onNavigate}><MdClose /></button>
      <Link to="/" className="admin-sidebar__brand" onClick={onNavigate}>
        <span>NutriNavigator</span>
        <small>Admin Panel</small>
      </Link>

      <nav className="admin-sidebar__nav">
        <NavLink to="/admin/dashboard" onClick={onNavigate} className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdDashboard /> Dashboard
        </NavLink>

        <div className="admin-nav-group">
          <button className="admin-nav-link admin-nav-link--toggle" onClick={() => setProductsOpen((o) => !o)}>
            <MdInventory /> Products {productsOpen ? <MdExpandLess className="admin-nav-chevron" /> : <MdExpandMore className="admin-nav-chevron" />}
          </button>
          {productsOpen && (
            <div className="admin-nav-subnav">
              <NavLink to="/admin/products" onClick={onNavigate} className={({ isActive }) => `admin-nav-sublink ${isActive ? "admin-nav-link--active" : ""}`}>
                <MdList /> All Products
              </NavLink>
              <NavLink to="/admin/product" onClick={onNavigate} className={({ isActive }) => `admin-nav-sublink ${isActive ? "admin-nav-link--active" : ""}`}>
                <MdAdd /> Create Product
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/admin/orders" onClick={onNavigate} className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdShoppingBag /> Orders
        </NavLink>

        <NavLink to="/admin/users" onClick={onNavigate} className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdPeople /> Users
        </NavLink>

        <NavLink to="/admin/reviews" onClick={onNavigate} className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdStar /> Reviews
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

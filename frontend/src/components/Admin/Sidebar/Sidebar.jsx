import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  MdDashboard, MdInventory, MdShoppingBag, MdPeople,
  MdStar, MdAdd, MdList, MdExpandMore, MdExpandLess,
} from "react-icons/md";
import "./Sidebar.css";

const Sidebar = () => {
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <aside className="admin-sidebar">
      <Link to="/" className="admin-sidebar__brand">
        <span>NutriNavigator</span>
        <small>Admin Panel</small>
      </Link>

      <nav className="admin-sidebar__nav">
        <NavLink to="/admin/dashboard" className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdDashboard /> Dashboard
        </NavLink>

        <div className="admin-nav-group">
          <button className="admin-nav-link admin-nav-link--toggle" onClick={() => setProductsOpen((o) => !o)}>
            <MdInventory /> Products {productsOpen ? <MdExpandLess className="admin-nav-chevron" /> : <MdExpandMore className="admin-nav-chevron" />}
          </button>
          {productsOpen && (
            <div className="admin-nav-subnav">
              <NavLink to="/admin/products" className={({ isActive }) => `admin-nav-sublink ${isActive ? "admin-nav-link--active" : ""}`}>
                <MdList /> All Products
              </NavLink>
              <NavLink to="/admin/product" className={({ isActive }) => `admin-nav-sublink ${isActive ? "admin-nav-link--active" : ""}`}>
                <MdAdd /> Create Product
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/admin/orders" className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdShoppingBag /> Orders
        </NavLink>

        <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdPeople /> Users
        </NavLink>

        <NavLink to="/admin/reviews" className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link--active" : ""}`}>
          <MdStar /> Reviews
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

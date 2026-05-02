import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { MdSearch, MdShoppingCart, MdMenu, MdClose } from "react-icons/md";
import UserOptions from "./UserOptions/UserOptions";
import "./Header.css";
import logo from "../../../images/logos/brandlogo.png";

const NAV_LINKS = [
  { to: "/",            label: "Home" },
  { to: "/products",   label: "Products" },
  { to: "/dietrecommend", label: "Get Dietary" },
];

const Header = () => {
  const { cartItems } = useSelector((s) => s.cartR);
  const { isAuthenticated, user } = useSelector((s) => s.userR);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <img src={logo} alt="NutriNavigator" />
        </Link>

        <nav className={`header-nav ${mobileOpen ? "header-nav--open" : ""}`}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Link to="/search" className="header-icon-btn" aria-label="Search">
            <MdSearch />
          </Link>
          <Link to="/cart" className="header-icon-btn header-cart-btn" aria-label="Cart">
            <MdShoppingCart />
            {cartItems.length > 0 && (
              <span className="cart-badge">{cartItems.length}</span>
            )}
          </Link>

          {isAuthenticated ? (
            <UserOptions user={user} />
          ) : (
            <Link to="/login" className="btn btn--outline-light btn--sm">
              Sign In
            </Link>
          )}

          <button
            className="header-burger"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <MdClose /> : <MdMenu />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
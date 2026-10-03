import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { MdSearch, MdShoppingCart, MdMenu, MdClose } from "react-icons/md";
import Container from "../Container";
import UserOptions from "./UserOptions/UserOptions";
import logo from "../../../images/logos/brandlogo.png";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
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

  const navLinkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 font-body text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`;
  const iconClass = "relative flex h-11 w-11 items-center justify-center rounded-full text-xl text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <header className={`sticky top-0 z-[100] bg-brand-900 ${scrolled ? "shadow-md" : ""}`}>
      <Container className="flex h-[68px] items-center justify-between gap-3 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="NutriNavigator home">
          <img src={logo} alt="NutriNavigator" className="h-9 w-auto brightness-0 invert" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={navLinkClass}>{label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link to="/search" className={iconClass} aria-label="Search"><MdSearch /></Link>
          <Link to="/cart" className={iconClass} aria-label="Cart">
            <MdShoppingCart />
            {cartItems.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cream-50 px-0.5 font-body text-[10px] font-bold leading-none text-brand-900">
                {cartItems.length}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <UserOptions user={user} />
          ) : (
            <Link to="/login" className="ml-1 hidden rounded-full border border-white/60 px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex">
              Sign In
            </Link>
          )}
          <button
            type="button"
            className={`${iconClass} md:hidden`}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <MdClose /> : <MdMenu />}
          </button>
        </div>
      </Container>
      {mobileOpen && (
        <nav id="mobile-navigation" className="border-t border-white/10 bg-brand-900 px-4 pb-4 pt-3 shadow-lg md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-content flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navLinkClass} onClick={() => setMobileOpen(false)}>{label}</NavLink>
            ))}
            {!isAuthenticated && <Link to="/login" className="rounded-full px-4 py-2 font-body text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white sm:hidden" onClick={() => setMobileOpen(false)}>Sign In</Link>}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;

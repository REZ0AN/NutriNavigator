import React from "react";
import { Link } from "react-router-dom";
import Container from "../Container";

const linkClass = "block font-body text-sm text-earth-600 transition-colors hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";
const headingClass = "mb-4 font-body text-xs font-semibold uppercase tracking-widest text-brand-700";

const Footer = () => (
  <footer className="border-t border-brand-100 bg-cream-50">
    <Container className="grid gap-9 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-10 lg:py-16">
      <div className="sm:col-span-2 lg:col-span-1">
        <h2 className="font-display text-2xl text-brand-900">NutriNavigator</h2>
        <p className="mt-3 max-w-xs font-body text-sm leading-relaxed text-earth-600">Your guide to organic delights and nutritional insight.</p>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className={headingClass}>Explore</h3>
        <Link to="/" className={linkClass}>Home</Link>
        <Link to="/products" className={linkClass}>Products</Link>
        <Link to="/dietrecommend" className={linkClass}>Diet Recommendations</Link>
        <Link to="/search" className={linkClass}>Search</Link>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className={headingClass}>Account</h3>
        <Link to="/profile" className={linkClass}>My Profile</Link>
        <Link to="/orders/me" className={linkClass}>My Orders</Link>
        <Link to="/cart" className={linkClass}>Cart</Link>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className={headingClass}>Connect</h3>
        <a href="https://www.linkedin.com/in/rezoan-abir/" target="_blank" rel="noreferrer" className={linkClass}>LinkedIn</a>
        <a href="https://github.com/REZ0AN" target="_blank" rel="noreferrer" className={linkClass}>GitHub</a>
        <a href="https://www.facebook.com/ahmedabir02" target="_blank" rel="noreferrer" className={linkClass}>Facebook</a>
      </div>
    </Container>
    <div className="border-t border-brand-100 px-4 py-5 text-center font-body text-xs text-earth-400">
      © {new Date().getFullYear()} NutriNavigator · Build with Care by REZ0AN
    </div>
  </footer>
);

export default Footer;

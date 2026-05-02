import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <h2 className="footer-logo">NutriNavigator</h2>
        <p className="footer-tagline">Your guide to organic delights and nutritional insight.</p>
      </div>

      <div className="footer-links">
        <h4>Explore</h4>
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/dietrecommend">Diet Recommendations</Link>
        <Link to="/search">Search</Link>
      </div>

      <div className="footer-links">
        <h4>Account</h4>
        <Link to="/profile">My Profile</Link>
        <Link to="/orders/me">My Orders</Link>
        <Link to="/cart">Cart</Link>
      </div>

      <div className="footer-social">
        <h4>Connect</h4>
        <a href="https://www.linkedin.com/in/rezoan-abir/" target="_blank" rel="noreferrer">LinkedIn</a>
        <a href="https://github.com/REZ0AN" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://www.facebook.com/ahmedabir02" target="_blank" rel="noreferrer">Facebook</a>
      </div>
    </div>

    <div className="footer-bottom">
      <p>© {new Date().getFullYear()} NutriNavigator · Build with Care by REZ0AN</p>
    </div>
  </footer>
);

export default Footer;

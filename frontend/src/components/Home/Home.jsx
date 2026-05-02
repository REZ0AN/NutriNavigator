import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdArrowDownward } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import ProductCard from "./ProductCard";
import { getProducts, clearProductsError } from "../../store/slices/productSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./Home.css";

const Home = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const productsRef = useRef(null);
  const { loading, error, products } = useSelector((state) => state.productsR);
  const { isAuthenticated } = useSelector((state) => state.userR);

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearProductsError()); }
  }, [error, dispatch]);

  useEffect(() => {
    if (products.length === 0) {
      dispatch(getProducts({}));
    }
  }, [dispatch, products.length])
  const scrollToProducts = () =>
    productsRef.current?.scrollIntoView({ behavior: "smooth" });

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Home" />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-blobs">
          <div className="hero-blob hero-blob--1" />
          <div className="hero-blob hero-blob--2" />
          <div className="hero-blob hero-blob--3" />
        </div>
        <div className="hero-content">
          <span className="hero-eyebrow">Organic &amp; Natural</span>
          <h1 className="hero-title">
            Nourish Your <em>Body</em>,<br /> Fuel Your <em>Life</em>
          </h1>
          <p className="hero-subtitle">
            Take care of your body, it's the only place you have to live.
          </p>
          <div className="hero-actions">
            {!isAuthenticated && (
              <button className="btn btn--primary" onClick={() => navigate("/login")}>
                Join Us
              </button>
            )}
            <button className="btn btn--outline-light" onClick={scrollToProducts}>
              Shop Now
            </button>
          </div>
        </div>
        <button className="hero-scroll-hint" onClick={scrollToProducts} aria-label="Scroll to products">
          <MdArrowDownward />
        </button>
      </section>

      {/* ── Featured Products ── */}
      <div className="featured-bg">
              <section className="featured-section" ref={productsRef}>
        <div className="section-header">
          <h2 className="section-title">Featured Products</h2>
          <p className="section-subtitle">Hand-picked organic produce for you</p>
        </div>
        <div className="products-grid">
          {products && products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
        <div className="featured-cta">
          <Link to="/products" className="btn btn--primary">Browse All Products</Link>
        </div>
      </section>
      </div>

      {/* ── Diet CTA ── */}
<section className="diet-cta-section">
  <div className="diet-pill diet-pill--1" />
  <div className="diet-pill diet-pill--2" />
  <div className="diet-pill diet-pill--3" />
  <div className="diet-pill diet-pill--4" />
  <div className="diet-pill diet-pill--5" />
  <div className="diet-pill diet-pill--6" />
  
  <div className="diet-cta-content">
    <h2 className="diet-cta-title">
      Get Your Personalised<br />Diet Recommendation
    </h2>
    <p className="diet-cta-text">
      NutriNavigator is your dedicated companion on the journey to optimal well-being.
      Tell us about your health profile and we'll find the right foods for you.
    </p>
    <button className="btn btn--primary" onClick={() => navigate("/dietrecommend")}>
      Get Dietary Plan
    </button>
  </div>
</section>
    </>
  );
};

export default Home;

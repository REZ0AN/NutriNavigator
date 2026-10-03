import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdArrowDownward } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import Container from "../layouts/Container";
import Button from "../ui/Button";
import ProductCard from "./ProductCard";
import { getProducts, clearProductsError } from "../../store/slices/productSlice";
import { toastifyOptions } from "../../utils/toastify";
import cover from "../../images/Cover/cover.png";

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  }, [dispatch, products.length]);

  const scrollToProducts = () =>
    productsRef.current?.scrollIntoView({ behavior: "smooth" });

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Home" />

      <section className="relative isolate flex min-h-[min(760px,92vh)] items-center overflow-hidden bg-brand-900 py-24 sm:py-32">
        <img src={cover} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-left" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-900/90 via-brand-900/65 to-brand-900/30" />
        <Container>
          <div className="max-w-2xl text-center md:text-left">
            <span className="mb-6 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-cream-50">
              Organic &amp; Natural
            </span>
            <h1 className="font-display text-4xl leading-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              Nourish Your <em>Body</em>,<br /> Fuel Your <em>Life</em>
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-lg leading-relaxed text-white/90 md:mx-0">
              Take care of your body, it's the only place you have to live.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              {!isAuthenticated && <Button variant="light" onClick={() => navigate("/login")}>Join Us</Button>}
              <Button variant="outline-light" onClick={scrollToProducts}>Shop Now</Button>
            </div>
          </div>
        </Container>
        <button
          className="absolute bottom-6 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/50 bg-white/10 text-xl text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={scrollToProducts}
          aria-label="Scroll to products"
        >
          <MdArrowDownward />
        </button>
      </section>

      <section ref={productsRef} className="bg-cream-100 py-16 sm:py-20">
        <Container>
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl text-earth-900 sm:text-4xl">Featured Products</h2>
            <p className="mt-3 font-body text-base text-earth-600">Hand-picked organic produce for you</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products && products.map((product) => <ProductCard key={product._id} product={product} />)}
          </div>
          <div className="mt-10 text-center">
            <Button as={Link} to="/products">Browse All Products</Button>
          </div>
        </Container>
      </section>

      <section className="bg-brand-900 py-16 text-center sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl leading-tight text-cream-50 sm:text-4xl">
              Get Your Personalised<br />Diet Recommendation
            </h2>
            <p className="mx-auto mt-5 max-w-xl font-body leading-relaxed text-cream-50/85">
              NutriNavigator is your dedicated companion on the journey to optimal well-being.
              Tell us about your health profile and we'll find the right foods for you.
            </p>
            <Button variant="light" className="mt-8" onClick={() => navigate("/dietrecommend")}>Get Dietary Plan</Button>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;

import React from "react";
import { Link, useNavigate } from "react-router-dom";

const ERROR_CONTENT = {
  401: {
    title: "Sign-in required",
    message: "Your session is missing or has expired. Sign in to continue.",
    action: "Go to sign in",
    to: "/login",
  },
  403: {
    title: "Access denied",
    message: "You do not have permission to view this page.",
    action: "Go to home",
    to: "/",
  },
  404: {
    title: "Page not found",
    message: "The page you requested does not exist or may have moved.",
    action: "Go to home",
    to: "/",
  },
  503: {
    title: "Service temporarily unavailable",
    message: "This service is unavailable right now. Please try again shortly.",
    action: "Try again",
    retry: true,
    to: "/",
  },
};

const ErrorPage = ({ status = 404 }) => {
  const navigate = useNavigate();
  const content = ERROR_CONTENT[status] || ERROR_CONTENT[404];

  const handleAction = () => {
    if (content.retry) {
      window.location.reload();
      return;
    }
    navigate(content.to);
  };

  return (
    <main className="grid min-h-[72vh] place-items-center bg-cream-100 px-4 py-8" role="main">
      <div className="w-full max-w-[560px] rounded-card border border-admin-border bg-white px-4 py-10 text-center shadow-md sm:px-8 sm:py-12">
        <p className="font-body text-[clamp(4rem,14vw,7rem)] font-bold leading-none text-brand-500" aria-label={`Error ${status}`}>{status}</p>
        <p className="mb-2 mt-5 font-body text-sm uppercase tracking-[0.14em] text-earth-600">NutriNavigator</p>
        <h1 className="font-display text-3xl text-earth-900">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-[38rem] font-body text-earth-600">{content.message}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 min-[481px]:flex-row">
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={handleAction}>{content.action}</button>
          {content.retry && <Link className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" to="/">Go to home</Link>}
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./ErrorPage.css";

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
    <main className="error-page" role="main">
      <div className="error-page__card">
        <p className="error-page__code" aria-label={`Error ${status}`}>{status}</p>
        <p className="error-page__eyebrow">NutriNavigator</p>
        <h1>{content.title}</h1>
        <p className="error-page__message">{content.message}</p>
        <div className="error-page__actions">
          <button type="button" className="btn btn--primary" onClick={handleAction}>{content.action}</button>
          {content.retry && <Link className="btn btn--secondary" to="/">Go to home</Link>}
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;

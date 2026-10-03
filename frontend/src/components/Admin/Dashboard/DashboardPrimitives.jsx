import React from "react";
import { Link } from "react-router-dom";

export const MetricCard = ({ label, value, note, to }) => {
  const content = (
    <>
      <span className="font-body text-xs font-medium text-admin-muted">{label}</span>
      <strong className="mt-2 truncate font-body text-2xl font-semibold tracking-tight text-admin-ink sm:text-[1.75rem]">{value}</strong>
      <span className="mt-1 font-body text-xs text-admin-muted">{note}</span>
    </>
  );
  const className = "flex min-h-24 min-w-0 flex-col justify-center rounded-card border border-admin-border bg-white px-4 py-3 sm:px-5";

  return to ? (
    <Link to={to} className={`${className} transition-colors hover:border-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700`}>
      {content}
    </Link>
  ) : <div className={className}>{content}</div>;
};

export const AnalyticsPanel = ({ title, action, children, className = "" }) => (
  <section className={`min-w-0 rounded-card border border-admin-border bg-white p-4 sm:p-5 ${className}`.trim()}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-body text-base font-semibold text-admin-ink">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

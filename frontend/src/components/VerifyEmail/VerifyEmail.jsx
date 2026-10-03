import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { MdCheckCircle, MdError, MdHourglassEmpty } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import { verifyEmail } from "../../store/slices/userSlice";

// status: "loading" | "success" | "error"
const VerifyEmail = () => {
  const dispatch = useDispatch();
  const { token } = useParams();
  const called    = useRef(false);
  const [status,  setStatus]  = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;

    dispatch(verifyEmail(token)).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(result.payload || "Verification link is invalid or has expired.");
      }
    });
  }, [token, dispatch]);

  return (
    <>
      <MetaData title="Verify Email" />
      <div className="flex min-h-[calc(100vh-68px)] items-center justify-center bg-cream-100 px-4 py-8">
        <div className="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-card border border-admin-border bg-white px-6 py-12 text-center shadow-lg sm:px-10">

          {status === "loading" && (
            <>
              <MdHourglassEmpty aria-hidden="true" className="animate-spin text-6xl text-admin-muted motion-reduce:animate-none" />
              <h2 className="font-display text-2xl text-brand-900">Verifying your email…</h2>
              <p className="font-body text-sm leading-relaxed text-earth-600">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <MdCheckCircle aria-hidden="true" className="text-6xl text-green-700" />
              <h2 className="font-display text-2xl text-brand-900">Email Verified!</h2>
              <p className="font-body text-sm leading-relaxed text-earth-600">Your account is now active. You've been logged in automatically.</p>
              <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Go to Home</Link>
            </>
          )}

          {status === "error" && (
            <>
              <MdError aria-hidden="true" className="text-6xl text-red-700" />
              <h2 className="font-display text-2xl text-brand-900">Verification Failed</h2>
              <p className="font-body text-sm leading-relaxed text-earth-600">{message}</p>
              <Link to="/resend-verification" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
                Request a new link
              </Link>
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default VerifyEmail;

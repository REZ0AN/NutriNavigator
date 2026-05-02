import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { MdCheckCircle, MdError, MdHourglassEmpty } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import { verifyEmail } from "../../store/slices/userSlice";
import "./VerifyEmail.css";

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
      <div className="verify-page">
        <div className="verify-card">

          {status === "loading" && (
            <>
              <MdHourglassEmpty className="verify-icon verify-icon--loading" />
              <h2>Verifying your email…</h2>
              <p>Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <MdCheckCircle className="verify-icon verify-icon--success" />
              <h2>Email Verified!</h2>
              <p>Your account is now active. You've been logged in automatically.</p>
              <Link to="/" className="btn btn--primary">Go to Home</Link>
            </>
          )}

          {status === "error" && (
            <>
              <MdError className="verify-icon verify-icon--error" />
              <h2>Verification Failed</h2>
              <p>{message}</p>
              <Link to="/resend-verification" className="btn btn--secondary">
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
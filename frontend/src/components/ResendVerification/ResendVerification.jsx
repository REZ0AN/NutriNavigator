import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdMailOutline } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import { resendVerification, clearUserError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";

const ResendVerification = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.userR);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearUserError()); }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(resendVerification(email));
    if (!result.error) {
      setSent(true);
      toast.success("Verification email sent!", { ...toastifyOptions });
    }
  };

  return (
    <>
      <MetaData title="Resend Verification" />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <h2>Resend Verification</h2>
            <p>{sent ? "Check your inbox for the new link." : "Enter your email to receive a new verification link."}</p>
          </div>
          {!sent && (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <MdMailOutline className="auth-field__icon" />
                <input
                  type="email" placeholder="Your email address" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn--primary auth-submit" disabled={loading}>
                Send Verification Email
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ResendVerification;
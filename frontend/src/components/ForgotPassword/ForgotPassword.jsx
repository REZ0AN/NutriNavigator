import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdMailOutline } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { forgotPassword, clearForgotError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const { loading, message, error } = useSelector((s) => s.forgotPasswordR);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (error)   { toast.error(error, { ...toastifyOptions });     dispatch(clearForgotError()); }
    if (message) { toast.success(message, { ...toastifyOptions }); dispatch(clearForgotError()); }
  }, [error, message, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
  };

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Forgot Password" />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <h2>Forgot Password?</h2>
            <p>Enter your email and we'll send you a reset link.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <MdMailOutline className="auth-field__icon" />
              <input type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary auth-submit">Send Reset Link</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ForgotPassword;

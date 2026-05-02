import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MdLockOpen, MdLock } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { resetPassword, clearForgotError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";

const ResetPassword = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { token } = useParams();
  const { loading, success, error } = useSelector((s) => s.forgotPasswordR);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (error)   { toast.error(error, { ...toastifyOptions });                              dispatch(clearForgotError()); }
    if (success) { toast.success("Password updated successfully", { ...toastifyOptions }); navigate("/login"); }
  }, [error, success, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(resetPassword({ token, password, confirmPassword }));
  };

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Reset Password" />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <h2>Reset Password</h2>
            <p>Enter your new password below.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <MdLockOpen className="auth-field__icon" />
              <input type="password" placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="auth-field">
              <MdLock className="auth-field__icon" />
              <input type="password" placeholder="Confirm password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary auth-submit">Update Password</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ResetPassword;

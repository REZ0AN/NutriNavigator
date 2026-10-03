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
      <div className="relative flex min-h-[calc(100vh-68px)] items-center justify-center overflow-hidden bg-brand-900 px-4 py-8">
        <img src="/loginsignupbg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-brand-900/55" />
        <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-card bg-cream-50 shadow-xl">
          <div className="px-6 pt-8 text-center sm:px-8">
            <h2 className="font-display text-2xl text-brand-900">Reset Password</h2>
            <p className="mt-2 font-body text-sm text-earth-600">Enter your new password below.</p>
          </div>
          <form className="flex flex-col gap-4 p-6 sm:p-8" onSubmit={handleSubmit}>
            <label className="flex items-center gap-3 rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 transition-colors focus-within:border-brand-700 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
              <MdLockOpen aria-hidden="true" className="shrink-0 text-lg text-earth-600" />
              <span className="sr-only">New password</span>
              <input type="password" placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent font-body text-sm text-earth-900 outline-none placeholder:text-earth-400" />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 transition-colors focus-within:border-brand-700 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
              <MdLock aria-hidden="true" className="shrink-0 text-lg text-earth-600" />
              <span className="sr-only">Confirm password</span>
              <input type="password" placeholder="Confirm password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent font-body text-sm text-earth-900 outline-none placeholder:text-earth-400" />
            </label>
            <button type="submit" className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-900 px-5 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Update Password</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ResetPassword;

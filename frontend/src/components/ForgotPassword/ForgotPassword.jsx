import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdMailOutline } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { forgotPassword, clearForgotError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";
import { AuthShell, AuthHeader, AuthField, authFormClass, authInputClass, authSubmitClass } from "../Login/AuthShell";

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
      <AuthShell>
          <AuthHeader title="Forgot Password?">Enter your email and we'll send you a reset link.</AuthHeader>
          <form className={authFormClass} onSubmit={handleSubmit}>
            <AuthField label="Email address" icon={MdMailOutline}><input className={authInputClass} type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} /></AuthField>
            <button type="submit" className={authSubmitClass}>Send Reset Link</button>
          </form>
      </AuthShell>
    </>
  );
};
export default ForgotPassword;

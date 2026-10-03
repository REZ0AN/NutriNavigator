import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MdMailOutline, MdLockOpen, MdFace,MdCheckCircle } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { loginUser, registerUser, clearUserError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";
import { AuthShell, AuthField, authFormClass, authInputClass, authSubmitClass } from "./AuthShell";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, isAuthenticated, error } = useSelector((s) => s.userR);
  const [tab, setTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("/Profile.png");
  const [showResend, setShowResend] = useState(false);
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

useEffect(() => {
  if (error) {
    if (error.includes("verify your email")) {
      setShowResend(true); // show resend link
    } else {
      setShowResend(false);
    }
    toast.error(error, { ...toastifyOptions });
    dispatch(clearUserError());
  }
  if (isAuthenticated && tab === "login") {
    toast.success("Welcome back!", { ...toastifyOptions });
    navigate(`${redirect}`);
  }
}, [error, isAuthenticated, tab, navigate, dispatch, redirect]);
  const [regSuccess, setRegSuccess] = useState("");
  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email: loginEmail, password: loginPassword }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser({ name: regName, email: regEmail, password: regPassword, avatar }));
    if (!result.error) {
      setRegSuccess(`Verification email sent to ${regEmail}. Please check your inbox to activate your account.`);
    }
  };

  const handleAvatarChange = (e) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.readyState === 2) { setAvatarPreview(reader.result); setAvatar(reader.result); }
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Sign In" />
      <AuthShell>
          <div className="relative grid grid-cols-2 border-b border-admin-border bg-cream-50">
            <button type="button" className={`relative z-10 p-4 font-body text-sm font-semibold ${tab === "login" ? "text-brand-900" : "text-earth-600"}`} onClick={() => setTab("login")}>Sign In</button>
            <button type="button" className={`relative z-10 p-4 font-body text-sm font-semibold ${tab === "signup" ? "text-brand-900" : "text-earth-600"}`} onClick={() => setTab("signup")}>Sign Up</button>
            <div aria-hidden="true" className={`absolute bottom-0 left-0 h-[3px] w-1/2 rounded-t bg-brand-900 transition-transform ${tab === "signup" ? "translate-x-full" : ""}`} />
          </div>

          {tab === "login" && (
            <form className={authFormClass} onSubmit={handleLogin}>
              <AuthField label="Email address" icon={MdMailOutline}><input className={authInputClass} type="email" placeholder="Email address" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></AuthField>
              <AuthField label="Password" icon={MdLockOpen}><input className={authInputClass} type="password" placeholder="Password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></AuthField>
              <Link to="/password/forgot" className="-mt-2 text-right font-body text-xs font-medium text-brand-900 hover:underline">Forgot Password?</Link>
              <button type="submit" className={authSubmitClass}>Sign In</button>
              {showResend && (
  <div className="flex flex-col gap-2 rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-center">
    <p className="font-body text-xs font-medium text-amber-800">Your email is not verified.</p>
    <Link to="/resend-verification" className="font-body text-xs font-semibold text-amber-800 underline hover:text-brand-900">Resend verification email →</Link>
  </div>
)}
            </form>
          )}

          {tab === "signup" && (
              regSuccess ? (
                <div className={authFormClass}>
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <MdCheckCircle aria-hidden="true" className="text-5xl text-green-700" />
                    <p className="font-body text-sm leading-relaxed text-earth-600">{regSuccess}</p>
                    <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={() => { setRegSuccess(""); setTab("login"); }}>
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
            <form className={authFormClass} onSubmit={handleRegister} encType="multipart/form-data">
              <AuthField label="Full name" icon={MdFace}><input className={authInputClass} type="text" placeholder="Full name" required value={regName} onChange={(e) => setRegName(e.target.value)} /></AuthField>
              <AuthField label="Email address" icon={MdMailOutline}><input className={authInputClass} type="email" placeholder="Email address" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} /></AuthField>
              <AuthField label="Password" icon={MdLockOpen}><input className={authInputClass} type="password" placeholder="Password (min 8 chars)" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} /></AuthField>
              <div className="flex items-center gap-4">
                <img src={avatarPreview} alt="Avatar preview" className="h-[50px] w-[50px] rounded-full border-2 border-brand-300 object-cover" />
                <label className="flex-1 cursor-pointer rounded-lg border border-brand-900 px-4 py-2 text-center font-body text-sm font-medium text-brand-900 hover:bg-brand-900 hover:text-white">Choose Avatar<input className="sr-only" type="file" accept="image/*" onChange={handleAvatarChange} /></label>
              </div>
              <button type="submit" className={authSubmitClass}>Create Account</button>
            </form>
          ))}
      </AuthShell>
    </>
  );
};

export default Login;

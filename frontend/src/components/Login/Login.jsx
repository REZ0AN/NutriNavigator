import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MdMailOutline, MdLockOpen, MdFace,MdCheckCircle } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { loginUser, registerUser, clearUserError } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./Login.css";

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
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "auth-tab--active" : ""}`} onClick={() => setTab("login")}>Sign In</button>
            <button className={`auth-tab ${tab === "signup" ? "auth-tab--active" : ""}`} onClick={() => setTab("signup")}>Sign Up</button>
            <div className={`auth-tab-indicator ${tab === "signup" ? "auth-tab-indicator--right" : ""}`} />
          </div>

          {tab === "login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-field">
                <MdMailOutline className="auth-field__icon" />
                <input type="email" placeholder="Email address" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="auth-field">
                <MdLockOpen className="auth-field__icon" />
                <input type="password" placeholder="Password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              <Link to="/password/forgot" className="auth-forgot">Forgot Password?</Link>
              <button type="submit" className="btn btn--primary auth-submit">Sign In</button>
              {showResend && (
  <div className="auth-resend-notice">
    <p>Your email is not verified.</p>
    <Link to="/resend-verification" className="auth-resend-link">
      Resend verification email →
    </Link>
  </div>
)}
            </form>
          )}

          {tab === "signup" && (
              regSuccess ? (
                <div className="auth-form">
                  <div className="auth-success-msg">
                    <MdCheckCircle className="auth-success-icon" />
                    <p>{regSuccess}</p>
                    <button className="btn btn--secondary" onClick={() => { setRegSuccess(""); setTab("login"); }}>
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
            <form className="auth-form" onSubmit={handleRegister} encType="multipart/form-data">
              <div className="auth-field">
                <MdFace className="auth-field__icon" />
                <input type="text" placeholder="Full name" required value={regName} onChange={(e) => setRegName(e.target.value)} />
              </div>
              <div className="auth-field">
                <MdMailOutline className="auth-field__icon" />
                <input type="email" placeholder="Email address" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              </div>
              <div className="auth-field">
                <MdLockOpen className="auth-field__icon" />
                <input type="password" placeholder="Password (min 8 chars)" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
              </div>
              <div className="auth-avatar">
                <img src={avatarPreview} alt="Avatar preview" className="auth-avatar__preview" />
                <label className="auth-avatar__label">Choose Avatar<input type="file" accept="image/*" onChange={handleAvatarChange} /></label>
              </div>
              <button type="submit" className="btn btn--primary auth-submit">Create Account</button>
            </form>
          ))}
        </div>
      </div>
    </>
  );
};

export default Login;

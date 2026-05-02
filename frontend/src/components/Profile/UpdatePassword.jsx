import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MdVpnKey, MdLockOpen, MdLock } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { updatePassword, resetProfileOp, clearProfileError } from "../../store/slices/profileSlice";
import { toastifyOptions } from "../../utils/toastify";

const UpdatePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, isUpdated, error } = useSelector((s) => s.profileR);
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");

  useEffect(() => {
    if (error)     { toast.error(error, { ...toastifyOptions }); dispatch(clearProfileError()); }
    if (isUpdated) { toast.success("Password updated!", { ...toastifyOptions }); dispatch(resetProfileOp()); navigate("/profile"); }
  }, [error, isUpdated, dispatch, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updatePassword({ oldPassword, newPassword, confirmPassword }));
  };

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Change Password" />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header"><h2>Change Password</h2></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field"><MdVpnKey className="auth-field__icon" /><input type="password" placeholder="Current password" required value={oldPassword} onChange={(e) => setOld(e.target.value)} /></div>
            <div className="auth-field"><MdLockOpen className="auth-field__icon" /><input type="password" placeholder="New password" required value={newPassword} onChange={(e) => setNew(e.target.value)} /></div>
            <div className="auth-field"><MdLock className="auth-field__icon" /><input type="password" placeholder="Confirm new password" required value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} /></div>
            <button type="submit" className="btn btn--primary auth-submit">Update Password</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default UpdatePassword;

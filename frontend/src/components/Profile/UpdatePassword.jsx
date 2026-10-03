import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MdVpnKey, MdLockOpen, MdLock } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { updatePassword, resetProfileOp, clearProfileError } from "../../store/slices/profileSlice";
import { toastifyOptions } from "../../utils/toastify";
import { AuthShell, AuthHeader, AuthField, authFormClass, authInputClass, authSubmitClass } from "../Login/AuthShell";

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
      <AuthShell>
          <AuthHeader title="Change Password" />
          <form className={authFormClass} onSubmit={handleSubmit}>
            <AuthField label="Current password" icon={MdVpnKey}><input className={authInputClass} type="password" placeholder="Current password" required value={oldPassword} onChange={(e) => setOld(e.target.value)} /></AuthField>
            <AuthField label="New password" icon={MdLockOpen}><input className={authInputClass} type="password" placeholder="New password" required value={newPassword} onChange={(e) => setNew(e.target.value)} /></AuthField>
            <AuthField label="Confirm new password" icon={MdLock}><input className={authInputClass} type="password" placeholder="Confirm new password" required value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} /></AuthField>
            <button type="submit" className={authSubmitClass}>Update Password</button>
          </form>
      </AuthShell>
    </>
  );
};
export default UpdatePassword;

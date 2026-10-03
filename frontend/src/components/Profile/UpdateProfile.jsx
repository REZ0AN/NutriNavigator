import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MdMailOutline, MdFace } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { updateProfile, resetProfileOp, clearProfileError } from "../../store/slices/profileSlice";
import { loadUser } from "../../store/slices/userSlice";
import { toastifyOptions } from "../../utils/toastify";
import { AuthShell, AuthHeader, AuthField, authFormClass, authInputClass, authSubmitClass } from "../Login/AuthShell";

const UpdateProfile = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector((s) => s.userR);
  const { loading, isUpdated, error } = useSelector((s) => s.profileR);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("/Profile.png");

  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); setAvatarPreview(user.avatar?.url || "/Profile.png"); }
    if (error)     { toast.error(error, { ...toastifyOptions }); dispatch(clearProfileError()); }
    if (isUpdated) { toast.success("Profile updated!", { ...toastifyOptions }); dispatch(loadUser()); dispatch(resetProfileOp()); navigate("/profile"); }
  }, [user, error, isUpdated, dispatch, navigate]);

  const handleAvatarChange = (e) => {
    const reader = new FileReader();
    reader.onload = () => { if (reader.readyState === 2) { setAvatarPreview(reader.result); setAvatar(reader.result); } };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateProfile({ name, email, avatar }));
  };

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Update Profile" />
      <AuthShell>
          <AuthHeader title="Update Profile" />
          <form className={authFormClass} onSubmit={handleSubmit} encType="multipart/form-data">
            <AuthField label="Full name" icon={MdFace}><input className={authInputClass} type="text" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} /></AuthField>
            <AuthField label="Email address" icon={MdMailOutline}><input className={authInputClass} type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} /></AuthField>
            <div className="flex items-center gap-4">
              <img src={avatarPreview} alt="Preview" className="h-[50px] w-[50px] rounded-full border-2 border-brand-300 object-cover" />
              <label className="flex-1 cursor-pointer rounded-lg border border-brand-900 px-4 py-2 text-center font-body text-sm font-medium text-brand-900 hover:bg-brand-900 hover:text-white">Change Avatar<input className="sr-only" type="file" accept="image/*" onChange={handleAvatarChange} /></label>
            </div>
            <button type="submit" className={authSubmitClass}>Save Changes</button>
          </form>
      </AuthShell>
    </>
  );
};
export default UpdateProfile;

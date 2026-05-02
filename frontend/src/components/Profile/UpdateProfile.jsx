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
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header"><h2>Update Profile</h2></div>
          <form className="auth-form" onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="auth-field">
              <MdFace className="auth-field__icon" />
              <input type="text" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="auth-field">
              <MdMailOutline className="auth-field__icon" />
              <input type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="auth-avatar">
              <img src={avatarPreview} alt="Preview" className="auth-avatar__preview" />
              <label className="auth-avatar__label">Change Avatar<input type="file" accept="image/*" onChange={handleAvatarChange} /></label>
            </div>
            <button type="submit" className="btn btn--primary auth-submit">Save Changes</button>
          </form>
        </div>
      </div>
    </>
  );
};
export default UpdateProfile;

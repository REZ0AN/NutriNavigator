import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { MdEdit, MdLock, MdListAlt } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import "./Profile.css";

const Profile = () => {
  const { user, loading, isAuthenticated } = useSelector((s) => s.userR);
  const navigate = useNavigate();

  useEffect(() => { if (!isAuthenticated) navigate("/login"); }, [isAuthenticated, navigate]);

  if (loading || !user) return <Loader />;

  return (
    <>
      <MetaData title={`${user.name}'s Profile`} />
      <div className="profile-page">
        <div className="profile-card">
          <div className="profile-card__avatar-col">
            <img src={user.avatar?.url || "/Profile.png"} alt={user.name} className="profile-avatar" />
            <h2 className="profile-name">{user.name}</h2>
            <span className="profile-role">{user.role}</span>
          </div>
          <div className="profile-card__info-col">
            <div className="profile-info-row">
              <span className="profile-info-label">Full Name</span>
              <span className="profile-info-value">{user.name}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{user.email}</span>
            </div>
            <div className="profile-actions">
              <Link to="/profile/update" className="btn btn--primary"><MdEdit /> Edit Profile</Link>
              <Link to="/orders/me"      className="btn btn--secondary"><MdListAlt /> My Orders</Link>
              <Link to="/password/update" className="btn btn--secondary"><MdLock /> Change Password</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Profile;

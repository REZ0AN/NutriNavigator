import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { MdEdit, MdLock, MdListAlt } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";

const Profile = () => {
  const { user, loading, isAuthenticated } = useSelector((s) => s.userR);
  const navigate = useNavigate();

  useEffect(() => { if (!isAuthenticated) navigate("/login"); }, [isAuthenticated, navigate]);

  if (loading || !user) return <Loader />;

  return (
    <>
      <MetaData title={`${user.name}'s Profile`} />
      <div className="flex min-h-[calc(100vh-68px)] justify-center bg-cream-100 px-4 py-6 sm:px-6 sm:py-12">
        <div className="w-full max-w-[760px] overflow-hidden rounded-card border border-admin-border bg-white shadow-md">
          <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-brand-900 to-brand-500 px-6 py-8 sm:px-8 sm:py-10">
            <img src={user.avatar?.url || "/Profile.png"} alt={user.name} className="h-[110px] w-[110px] rounded-full border-4 border-white/30 object-cover ring-4 ring-brand-300/40" />
            <h2 className="text-center font-display text-2xl text-white">{user.name}</h2>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-body text-xs font-semibold uppercase tracking-widest text-brand-100">{user.role}</span>
          </div>
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-1">
              <span className="font-body text-xs font-bold uppercase tracking-widest text-admin-muted">Full Name</span>
              <span className="font-body text-earth-900">{user.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-body text-xs font-bold uppercase tracking-widest text-admin-muted">Email</span>
              <span className="font-body text-earth-900">{user.email}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 border-t border-admin-border pt-6">
              <Link to="/profile/update" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full sm:min-w-[140px] sm:flex-1"><MdEdit /> Edit Profile</Link>
              <Link to="/orders/me"      className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full sm:min-w-[140px] sm:flex-1"><MdListAlt /> My Orders</Link>
              <Link to="/password/update" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full sm:min-w-[140px] sm:flex-1"><MdLock /> Change Password</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Profile;

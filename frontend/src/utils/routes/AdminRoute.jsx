import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import Loader from "../../components/layouts/Loader/Loader";

const ADMIN_ROLES = ["admin", "master"];

const AdminRoute = () => {
  const { loading, isAuthenticated, user } = useSelector((state) => state.userR);
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!ADMIN_ROLES.includes(user?.role)) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default AdminRoute;

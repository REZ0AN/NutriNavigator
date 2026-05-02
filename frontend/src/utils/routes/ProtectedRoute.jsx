import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import Loader from "../../components/layouts/Loader/Loader";

const ProtectedRoute = () => {
  const { loading, isAuthenticated } = useSelector((state) => state.userR);
  if (loading) return <Loader />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

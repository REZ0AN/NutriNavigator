import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MdPerson, MdMailOutline, MdVerifiedUser } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { getUserDetails, updateUserAdmin, resetAdminUserOp, clearAdminUserError } from "../../../store/slices/userSlice";
import { toastifyOptions } from "../../../utils/toastify";

const UpdateUser = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { loading, user, isUpdated, error } = useSelector((s) => s.adminUsersR);

  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("");

  useEffect(() => {
    if (user?._id !== id) {
      dispatch(getUserDetails(id));
    } else {
      setName(user.name || ""); setEmail(user.email || ""); setRole(user.role || "");
    }
    if (error)     { toast.error(error, { ...toastifyOptions }); dispatch(clearAdminUserError()); }
    if (isUpdated) { toast.success("User updated!", { ...toastifyOptions }); dispatch(resetAdminUserOp()); navigate("/admin/users"); }
  }, [user, id, error, isUpdated, dispatch, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateUserAdmin({ id, userData: { name, email, role } }));
  };

  if (loading) return <Loader />;

  return (
    <AdminLayout>
      <MetaData title="Update User — Admin" />
      <h1 className="admin-page-title">Update User</h1>
      <div className="admin-form-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdPerson /><input type="text" placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdMailOutline /><input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="admin-field">
            <div className="admin-input-wrap">
              <MdVerifiedUser />
              <select required value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn--primary" disabled={!role || loading}>Update User</button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default UpdateUser;

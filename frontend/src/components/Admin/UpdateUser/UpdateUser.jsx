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
      <h1 className="mb-6 font-body text-2xl font-bold text-brand-900">Update User</h1>
      <div className="max-w-[600px] rounded-card border border-admin-border bg-white p-5 shadow-sm sm:p-8">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdPerson /><input type="text" placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdMailOutline /><input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
            <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
              <MdVerifiedUser />
              <select required value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" disabled={!role || loading}>Update User</button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default UpdateUser;

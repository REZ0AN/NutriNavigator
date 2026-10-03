import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdEdit, MdDelete } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import AdminLayout from "../AdminLayout";
import { getAllUsers, deleteUser, resetAdminUserOp, clearAdminUserError } from "../../../store/slices/userSlice";
import { toastifyOptions } from "../../../utils/toastify";

const UsersList = () => {
  const dispatch  = useDispatch();
  const { users, isDeleted, error } = useSelector((s) => s.adminUsersR);
useEffect(() => {
  if (error)     { toast.error(error, { ...toastifyOptions }); dispatch(clearAdminUserError()); }
  if (isDeleted) { toast.success("User deleted", { ...toastifyOptions }); dispatch(resetAdminUserOp()); }
}, [error, isDeleted, dispatch]);

useEffect(() => {
  if(users.length === 0) {
      dispatch(getAllUsers());
  }
  
}, [dispatch, users.length]);

  return (
    <AdminLayout>
      <MetaData title="All Users — Admin" />
      <h1 className="mb-6 font-body text-2xl font-bold text-brand-900">All Users</h1>
      <div className="overflow-x-auto rounded-card border border-admin-border bg-white shadow-sm">
        <table className="w-full border-collapse font-body [&_th]:whitespace-nowrap [&_th]:bg-brand-900 [&_th]:px-5 [&_th]:py-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-white [&_td]:border-b [&_td]:border-admin-border [&_td]:px-5 [&_td]:py-4 [&_td]:align-middle [&_td]:text-sm [&_td]:text-earth-600">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u._id}>
                <td className="font-mono text-xs text-admin-muted">{u._id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={u.role === "admin" ? "font-semibold text-green-700" : ""}>{u.role}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/user/${u._id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"><MdEdit /></Link>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => dispatch(deleteUser(u._id))}><MdDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default UsersList;

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
      <h1 className="admin-page-title">All Users</h1>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u._id}>
                <td style={{ fontFamily: "monospace", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{u._id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={u.role === "admin" ? "greenColor" : ""}>{u.role}</span></td>
                <td>
                  <div className="admin-actions-cell">
                    <Link to={`/admin/user/${u._id}`} className="admin-action-btn admin-action-btn--edit"><MdEdit /></Link>
                    <button className="admin-action-btn admin-action-btn--delete" onClick={() => dispatch(deleteUser(u._id))}><MdDelete /></button>
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

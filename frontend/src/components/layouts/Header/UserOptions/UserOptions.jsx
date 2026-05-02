import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MdDashboard, MdPerson, MdExitToApp, MdListAlt, MdShoppingCart, MdExpandMore } from "react-icons/md";
import { logoutUser } from "../../../../store/slices/userSlice";
import { toastifyOptions } from "../../../../utils/toastify";
import "./UserOptions.css";

const UserOptions = ({ user }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartItems } = useSelector((state) => state.cartR);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate_to = (path) => { navigate(path); setOpen(false); };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success("Logged out successfully", { ...toastifyOptions });
    navigate("/");
    setOpen(false);
  };

  const menuItems = [
    ...(["admin", "master"].includes(user?.role)
      ? [{ icon: <MdDashboard />, label: "Dashboard", action: () => navigate_to("/admin/dashboard") }]
      : []),
    { icon: <MdPerson />,    label: "Profile", action: () => navigate_to("/profile") },
    { icon: <MdListAlt />,   label: "My Orders", action: () => navigate_to("/orders/me") },
    { icon: <MdShoppingCart />, label: `Cart (${cartItems.length})`, action: () => navigate_to("/cart") },
    { icon: <MdExitToApp />, label: "Logout", action: handleLogout, danger: true },
  ];

  return (
    <div className="user-options" ref={ref}>
      <button className="user-options__trigger" onClick={() => setOpen((o) => !o)}>
        <img
          src={user?.avatar?.url || "/Profile.png"}
          alt={user?.name}
          className="user-options__avatar"
        />
        <span className="user-options__name">{user?.name?.split(" ")[0]}</span>
        <MdExpandMore className={`user-options__chevron ${open ? "user-options__chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="user-options__menu">
          <div className="user-options__header">
            <img src={user?.avatar?.url || "/Profile.png"} alt={user?.name} />
            <div>
              <p className="user-options__menu-name">{user?.name}</p>
              <p className="user-options__menu-email">{user?.email}</p>
            </div>
          </div>
          <div className="user-options__divider" />
          {menuItems.map(({ icon, label, action, danger }) => (
            <button
              key={label}
              className={`user-options__item ${danger ? "user-options__item--danger" : ""}`}
              onClick={action}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOptions;

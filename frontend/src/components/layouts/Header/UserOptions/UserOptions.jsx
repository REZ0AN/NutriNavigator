import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MdDashboard, MdPerson, MdExitToApp, MdListAlt, MdShoppingCart, MdExpandMore } from "react-icons/md";
import { logoutUser } from "../../../../store/slices/userSlice";
import { toastifyOptions } from "../../../../utils/toastify";

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
    <div className="relative z-[101]" ref={ref}>
      <button type="button" aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => setOpen((o) => !o)}>
        <img
          src={user?.avatar?.url || "/Profile.png"}
          alt={user?.name}
          className="h-[30px] w-[30px] shrink-0 rounded-full border border-white/30 object-cover"
        />
        <span className="truncate font-body text-sm font-medium text-white">{user?.name?.split(" ")[0]}</span>
        <MdExpandMore aria-hidden="true" className={`text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] min-w-[280px] overflow-hidden rounded-card border border-brand-300 bg-white shadow-xl">
          <div className="flex items-center gap-3 px-4 pb-3 pt-4">
            <img src={user?.avatar?.url || "/Profile.png"} alt={user?.name} className="h-[42px] w-[42px] rounded-full border-2 border-brand-100 object-cover" />
            <div>
              <p className="font-body text-sm font-semibold text-earth-900">{user?.name}</p>
              <p className="mt-px font-body text-xs text-earth-600">{user?.email}</p>
            </div>
          </div>
          <div className="mx-3 h-px bg-admin-border" />
          {menuItems.map(({ icon, label, action, danger }) => (
            <button
              key={label}
              type="button"
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 ${danger ? "text-red-700 hover:bg-red-50" : "text-earth-600 hover:bg-cream-50 hover:text-brand-900"}`}
              onClick={action}
            >
              <span className="shrink-0 text-lg" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOptions;

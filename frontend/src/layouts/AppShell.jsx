import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Map, Activity, Bell, MessageSquareWarning, FileWarning,
  ShieldAlert, User, Menu, X, LogOut, Siren,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/risk-map", label: "Risk Map", icon: Map },
  { to: "/predictions", label: "Predictions", icon: Activity },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/incidents", label: "Incidents", icon: FileWarning },
  { to: "/assistant", label: "Emergency Assistant", icon: MessageSquareWarning },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const items = isAdmin ? [...NAV_ITEMS, { to: "/admin", label: "Admin Center", icon: ShieldAlert }] : NAV_ITEMS;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/5 p-5 sticky top-0 h-screen">
        <Logo />
        <nav className="mt-8 flex-1 flex flex-col gap-1">
          {items.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <UserFooter user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass flex items-center justify-between px-4 py-3">
        <Logo compact />
        <button onClick={() => setMobileOpen(true)} className="p-2 text-ink-100">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-72 bg-base-900 border-r border-white/10 z-50 p-5 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="p-1 text-ink-300">
                  <X size={20} />
                </button>
              </div>
              <nav className="mt-8 flex-1 flex flex-col gap-1" onClick={() => setMobileOpen(false)}>
                {items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </nav>
              <UserFooter user={user} onLogout={handleLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Logo({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-9 w-9 rounded-xl bg-cyan-accent/10 border border-cyan-accent/30 flex items-center justify-center">
        <Siren size={18} className="text-cyan-accent" />
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-severity-critical animate-pulse-ring" />
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-severity-critical" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display font-semibold text-sm text-ink-100">Sentinel</p>
          <p className="text-[11px] text-ink-500 -mt-0.5">Disaster Intelligence</p>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-cyan-accent/10 text-cyan-accent border border-cyan-accent/20"
            : "text-ink-300 hover:text-ink-100 hover:bg-white/5 border border-transparent"
        }`
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

function UserFooter({ user, onLogout }) {
  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center gap-3 px-1">
        <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <User size={16} className="text-ink-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-100 truncate">{user?.full_name || "—"}</p>
          <p className="text-[11px] text-ink-500 truncate">{user?.role || ""}</p>
        </div>
        <button onClick={onLogout} title="Log out" className="p-1.5 text-ink-500 hover:text-severity-critical transition-colors">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

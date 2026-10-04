import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Siren, Mail, Lock, ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      push("Welcome back.", "success");
      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold text-ink-100">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-500">Access your disaster intelligence dashboard.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field icon={Mail} type="email" placeholder="you@example.com" value={email} onChange={setEmail} label="Email" />
        <Field icon={Lock} type="password" placeholder="••••••••" value={password} onChange={setPassword} label="Password" />

        {error && <p className="text-sm text-severity-critical">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-accent text-base-950 font-medium py-3 mt-2 hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <>Sign in <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-500 text-center">
        Don't have an account? <Link to="/register" className="text-cyan-accent hover:underline">Create one</Link>
      </p>

      <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-ink-500">
        Demo login — <span className="text-ink-300">demo@disasterplatform.dev</span> / <span className="text-ink-300">Demo@123</span>
        <br />Admin login — <span className="text-ink-300">admin@disasterplatform.dev</span> / <span className="text-ink-300">Admin@123</span>
      </div>
    </AuthShell>
  );
}

export function Field({ icon: Icon, type, placeholder, value, onChange, label, required = true }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <div className="mt-1.5 relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-cyan-accent/50 outline-none transition-colors"
        />
      </div>
    </label>
  );
}

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid-fade">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="h-9 w-9 rounded-xl bg-cyan-accent/10 border border-cyan-accent/30 flex items-center justify-center">
            <Siren size={18} className="text-cyan-accent" />
          </div>
          <span className="font-display font-semibold text-ink-100">Sentinel</span>
        </Link>
        <div className="glass rounded-2xl p-7 sm:p-8">{children}</div>
      </motion.div>
    </div>
  );
}

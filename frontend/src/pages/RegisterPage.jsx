import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Phone, ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { AuthShell, Field } from "./LoginPage";

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const update = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      push("Account created. Welcome to Sentinel.", "success");
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold text-ink-100">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-500">Get real-time risk alerts for your area.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field icon={User} type="text" placeholder="Jane Doe" value={form.full_name} onChange={update("full_name")} label="Full name" />
        <Field icon={Mail} type="email" placeholder="you@example.com" value={form.email} onChange={update("email")} label="Email" />
        <Field icon={Phone} type="tel" placeholder="Optional" value={form.phone} onChange={update("phone")} label="Phone" required={false} />
        <Field icon={Lock} type="password" placeholder="At least 6 characters" value={form.password} onChange={update("password")} label="Password" />

        {error && <p className="text-sm text-severity-critical">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-accent text-base-950 font-medium py-3 mt-2 hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-500 text-center">
        Already have an account? <Link to="/login" className="text-cyan-accent hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}

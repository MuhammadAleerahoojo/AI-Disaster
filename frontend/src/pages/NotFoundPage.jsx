import { Link } from "react-router-dom";
import { AlertOctagon } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-grid-fade">
      <AlertOctagon size={40} className="text-ink-500 mb-4" />
      <h1 className="font-display text-3xl font-semibold text-ink-100">404</h1>
      <p className="text-ink-500 mt-2">This page doesn't exist.</p>
      <Link to="/" className="mt-6 text-cyan-accent hover:underline text-sm">Back to home</Link>
    </div>
  );
}

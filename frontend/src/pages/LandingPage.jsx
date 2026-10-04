import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Siren, Waves, Flame, Activity, Map, MessageSquareWarning, FileWarning, Users,
  ArrowRight, Radio, Database, BellRing, LifeBuoy,
} from "lucide-react";
import AnimatedCounter from "../components/AnimatedCounter";

const FEATURES = [
  { icon: Waves, title: "Flood Prediction", desc: "ML risk scoring from rainfall, soil saturation, and terrain signals." },
  { icon: Flame, title: "Fire Risk Prediction", desc: "Heat, humidity, and wind combined into a live fire-danger score." },
  { icon: Activity, title: "Earthquake Monitoring", desc: "Live USGS seismic feed with location-based impact assessment." },
  { icon: Map, title: "Live Risk Maps", desc: "Interactive layers for hazards, hotspots, and incident reports." },
  { icon: BellRing, title: "Emergency Alerts", desc: "Threshold-based alerts across in-app, email, and SMS channels." },
  { icon: FileWarning, title: "SOS Reporting", desc: "Report incidents with photos, location, and severity in seconds." },
  { icon: MessageSquareWarning, title: "AI Emergency Assistant", desc: "Instant safety guidance for floods, fires, quakes, and more." },
  { icon: LifeBuoy, title: "Rescue Coordination", desc: "Dispatch teams, track status, and measure response times." },
];

const STEPS = [
  { n: "01", title: "Collect real-time data", desc: "Weather, seismic, and satellite fire feeds are pulled continuously." },
  { n: "02", title: "Analyze & predict risk", desc: "Trained models turn raw signals into a clear risk score per hazard." },
  { n: "03", title: "Alert affected users", desc: "Thresholds trigger targeted alerts before conditions escalate." },
  { n: "04", title: "Coordinate response", desc: "Admins verify reports and dispatch rescue teams from one console." },
];

export default function LandingPage() {
  return (
    <div className="bg-grid-fade">
      <TopBar />
      <Hero />
      <Features />
      <HowItWorks />
      <Stats />
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 glass">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-accent/10 border border-cyan-accent/30 flex items-center justify-center">
            <Siren size={16} className="text-cyan-accent" />
          </div>
          <span className="font-display font-semibold text-ink-100">Sentinel</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="text-sm text-ink-300 hover:text-ink-100 px-3 py-2 transition-colors">Sign in</Link>
          <Link
            to="/register"
            className="text-sm font-medium bg-cyan-accent text-base-950 px-4 py-2 rounded-lg hover:brightness-110 transition"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <span className="inline-flex items-center gap-2 text-xs font-medium text-cyan-accent bg-cyan-accent/10 border border-cyan-accent/20 rounded-full px-3 py-1.5">
          <Radio size={12} /> Live multi-hazard monitoring
        </span>
        <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-semibold text-ink-100">
          AI-powered disaster intelligence & emergency response
        </h1>
        <p className="mt-5 text-ink-300 text-base sm:text-lg leading-relaxed max-w-xl">
          Sentinel predicts flood and fire risk, tracks seismic activity in real time,
          and gives affected communities clear guidance — while coordinating the teams
          who respond.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-cyan-accent text-base-950 font-medium px-5 py-3 rounded-xl hover:brightness-110 transition"
          >
            Get Started <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 border border-white/15 text-ink-100 font-medium px-5 py-3 rounded-xl hover:bg-white/5 transition"
          >
            View Live Risks
          </Link>
        </div>
        <div className="mt-10 flex items-center gap-6 text-sm text-ink-500">
          <MiniStat label="Active alerts" value={12} />
          <MiniStat label="Monitored regions" value={48} />
          <MiniStat label="Rescue teams" value={9} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      >
        <RadarVisual />
      </motion.div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-ink-100 font-display font-semibold text-lg"><AnimatedCounter value={value} /></p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function RadarVisual() {
  return (
    <div className="relative glass rounded-3xl aspect-square max-w-md mx-auto flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: "repeating-radial-gradient(circle, rgba(45,212,232,0.12) 0, rgba(45,212,232,0.12) 1px, transparent 1px, transparent 60px)"
      }} />
      {[1, 2, 3].map((r) => (
        <div key={r} className="absolute rounded-full border border-cyan-accent/20" style={{ width: `${r * 30}%`, height: `${r * 30}%` }} />
      ))}
      <motion.div
        className="absolute inset-0 origin-center"
        style={{ background: "conic-gradient(from 0deg, rgba(45,212,232,0.35), transparent 40%)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {[
        { top: "30%", left: "62%", color: "#EF4444" },
        { top: "58%", left: "34%", color: "#F97316" },
        { top: "70%", left: "68%", color: "#EAB308" },
        { top: "40%", left: "24%", color: "#22C55E" },
      ].map((p, i) => (
        <span key={i} className="absolute h-2.5 w-2.5 rounded-full" style={{ top: p.top, left: p.left, backgroundColor: p.color }}>
          <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ backgroundColor: p.color }} />
        </span>
      ))}
      <div className="relative z-10 h-16 w-16 rounded-full bg-base-900 border border-cyan-accent/40 flex items-center justify-center">
        <Activity size={26} className="text-cyan-accent" />
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20">
      <div className="max-w-xl">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-100">One platform, every hazard</h2>
        <p className="mt-3 text-ink-500">Prediction, monitoring, alerting, and response — connected end to end.</p>
      </div>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-5">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <f.icon size={18} className="text-cyan-accent" />
            </div>
            <h3 className="mt-4 font-display font-medium text-ink-100">{f.title}</h3>
            <p className="mt-1.5 text-sm text-ink-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-100">How it works</h2>
      <div className="mt-10 grid md:grid-cols-4 gap-6 relative">
        {STEPS.map((s) => (
          <div key={s.n} className="relative">
            <span className="font-display text-3xl font-semibold text-white/10">{s.n}</span>
            <h3 className="mt-2 font-display font-medium text-ink-100">{s.title}</h3>
            <p className="mt-1.5 text-sm text-ink-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { label: "Active alerts", value: 12, icon: BellRing },
    { label: "Monitored regions", value: 48, icon: Map },
    { label: "Incidents reported", value: 236, icon: FileWarning },
    { label: "Rescue operations", value: 57, icon: LifeBuoy },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
      <div className="glass rounded-2xl p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-accent/10 border border-cyan-accent/20 flex items-center justify-center shrink-0">
              <s.icon size={18} className="text-cyan-accent" />
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-ink-100"><AnimatedCounter value={s.value} /></p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-500">
        Figures shown are illustrative starting values and update from live platform data as it accumulates.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 mt-6">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Siren size={16} className="text-cyan-accent" />
            <span className="font-display font-semibold text-ink-100">Sentinel</span>
          </div>
          <p className="mt-3 text-sm text-ink-500 max-w-xs">
            AI-based disaster prediction and response platform. Built as an end-to-end
            portfolio project.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-500 mb-3">Data sources</p>
          <ul className="space-y-1.5 text-sm text-ink-300">
            <li className="flex items-center gap-2"><Database size={13} className="text-ink-500" /> USGS Earthquake Feed</li>
            <li className="flex items-center gap-2"><Database size={13} className="text-ink-500" /> Open-Meteo Weather API</li>
            <li className="flex items-center gap-2"><Database size={13} className="text-ink-500" /> NASA FIRMS Fire Data</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-500 mb-3">Important</p>
          <p className="text-sm text-ink-500 leading-relaxed">
            This platform is a decision-support and awareness tool. It does not replace
            official emergency services. In a life-threatening emergency, contact local
            authorities immediately.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 border-t border-white/5 text-xs text-ink-500">
        © {new Date().getFullYear()} Sentinel Disaster Intelligence — Portfolio project.
      </div>
    </footer>
  );
}

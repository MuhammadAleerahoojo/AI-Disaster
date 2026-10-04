import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Send, MessageSquareWarning, ShieldAlert, Sparkles, PhoneCall, MapPinned,
  Hospital, Building2, Flame, Home, Wifi, WifiOff, Waves, Activity,
  HeartPulse, LifeBuoy, ClipboardList, ChevronRight, Copy, Check,
  ThumbsUp, ThumbsDown, Mic, MicOff, AlertTriangle, Clock, Navigation,
  ExternalLink, Volume2, VolumeX, CircleDot, Info, Zap,
  LocateFixed, Siren, Cross,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import { sendChatMessage, getSafePlaces, getEmergencyServices } from "../services/api";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const URGENCY_CONFIG = {
  CRITICAL: {
    bg: "bg-red-500/10", border: "border-red-500/40", text: "text-red-400",
    glow: "shadow-[0_0_50px_-12px_rgba(239,68,68,0.6)]",
    label: "LIFE-THREATENING EMERGENCY", sub: "Call emergency services RIGHT NOW",
    icon: Siren, pulse: true,
  },
  HIGH: {
    bg: "bg-orange-500/10", border: "border-orange-500/40", text: "text-orange-400",
    glow: "shadow-[0_0_40px_-12px_rgba(249,115,22,0.5)]",
    label: "URGENT SITUATION", sub: "Stay calm and follow guidance below",
    icon: AlertTriangle, pulse: false,
  },
  MODERATE: {
    bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-400",
    glow: "", label: "SITUATION NOTED", sub: "Take precautions and monitor closely",
    icon: Info, pulse: false,
  },
};

const SERVICE_TYPES = {
  POLICE: { icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Police" },
  HOSPITAL: { icon: Hospital, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Hospital" },
  FIRE_STATION: { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Fire Station" },
  AMBULANCE: { icon: Cross, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Ambulance" },
  SHELTER: { icon: Home, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Shelter" },
  RESCUE: { icon: LifeBuoy, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", label: "Rescue" },
  OTHER: { icon: MapPinned, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", label: "Other" },
};

const CAPABILITIES = [
  { icon: Waves, label: "Flood safety", color: "text-blue-400" },
  { icon: Flame, label: "Fire safety", color: "text-orange-400" },
  { icon: Activity, label: "Earthquake response", color: "text-amber-400" },
  { icon: HeartPulse, label: "Injury first aid", color: "text-rose-400" },
  { icon: LifeBuoy, label: "Trapped / rescue guidance", color: "text-cyan-400" },
  { icon: MapPinned, label: "Nearby safe places", color: "text-emerald-400" },
  { icon: Siren, label: "Emergency services lookup", color: "text-red-400" },
];

const PK_EMERGENCY_NUMBERS = [
  { name: "Rescue (all emergencies)", number: "1122", tag: "Primary", urgent: true },
  { name: "Police", number: "15", tag: "Crime/Security", urgent: true },
  { name: "Edhi Ambulance", number: "115", tag: "Medical", urgent: false },
  { name: "Fire Brigade", number: "16", tag: "Fire", urgent: true },
  { name: "NDMA", number: "051-9205037", tag: "Disaster", urgent: false },
  { name: "Motorway Police", number: "130", tag: "Highway", urgent: false },
];

const QUICK_PROMPTS = [
  { label: "Flood", icon: Waves, prompt: "What should I do during a flood?" },
  { label: "Earthquake", icon: Activity, prompt: "How do I stay safe in an earthquake?" },
  { label: "Trapped", icon: LifeBuoy, prompt: "I'm trapped, what should I do?" },
  { label: "First aid", icon: HeartPulse, prompt: "How do I give first aid for bleeding?" },
  { label: "Emergency kit", icon: ClipboardList, prompt: "How do I prepare an emergency kit?" },
];

const INITIAL_MESSAGE = {
  id: "initial",
  role: "assistant",
  content:
    "Hi, I'm your emergency safety assistant. Describe your situation and I'll give clear, step-by-step guidance.\n\nI can also find **nearest police stations, hospitals, and fire stations** with their contact numbers and share your live location.\n\nFor life-threatening emergencies, call **Rescue 1122** immediately.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function AssistantPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [urgency, setUrgency] = useState("LOW");
  const [findingPlaces, setFindingPlaces] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [lastWasFallback, setLastWasFallback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [messages, typing, findingPlaces, locating, prefersReducedMotion]);

  /* Auto-detect location on mount */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  /* Send message */
  const sendMessage = useCallback(
    async (text) => {
      const content = (text ?? input).trim();
      if (!content || typing) return;

      setMessages((m) => [
        ...m,
        { role: "user", content, time: nowLabel(), id: crypto.randomUUID() },
      ]);
      setInput("");
      setTyping(true);

      try {
        const data = await sendChatMessage({
          session_id: sessionId,
          message: content,
          location: userLocation,
        });
        setSessionId(data.session_id);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply,
            isFallback: data.is_fallback,
            time: nowLabel(),
            id: crypto.randomUUID(),
          },
        ]);
        setSuggestions(data.suggested_actions || []);
        setUrgency(data.urgency || "LOW");
        setLastWasFallback(data.is_fallback);

        if (ttsEnabled && "speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(data.reply);
          utter.rate = 0.95;
          window.speechSynthesis.speak(utter);
        }
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Sorry, something went wrong reaching the assistant. Please try again.",
            time: nowLabel(),
            id: crypto.randomUUID(),
            error: true,
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [input, sessionId, typing, ttsEnabled, userLocation]
  );

  /* Get location as promise */
  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  /* Find emergency services */
  const findEmergencyServices = useCallback(
    async (serviceType = "ALL") => {
      setLocating(true);
      setMessages((m) => [
        ...m,
        {
          role: "user",
          content:
            serviceType === "ALL"
              ? "Find all nearest emergency services"
              : `Find nearest ${SERVICE_TYPES[serviceType]?.label || serviceType}`,
          time: nowLabel(),
          id: crypto.randomUUID(),
        },
      ]);

      try {
        const loc = userLocation || (await getLocation());
        setFindingPlaces(true);
        const services = await getEmergencyServices(loc.lat, loc.lng, serviceType);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            type: "services",
            services,
            userLocation: loc,
            time: nowLabel(),
            id: crypto.randomUUID(),
          },
        ]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "I couldn't access your location. Please enable location permission and try again.",
            time: nowLabel(),
            id: crypto.randomUUID(),
            error: true,
          },
        ]);
      } finally {
        setLocating(false);
        setFindingPlaces(false);
      }
    },
    [userLocation, getLocation]
  );

  /* Share live location */
  const shareLiveLocation = useCallback(async () => {
    setLocating(true);
    try {
      const loc = userLocation || (await getLocation());
      const mapsLink = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
      const message = `📍 My current location:\nLatitude: ${loc.lat.toFixed(6)}\nLongitude: ${loc.lng.toFixed(6)}\n\nOpen in Maps: ${mapsLink}`;
      setMessages((m) => [
        ...m,
        { role: "user", content: "Share my live location", time: nowLabel(), id: crypto.randomUUID() },
        {
          role: "assistant",
          type: "location",
          location: loc,
          mapsLink,
          content: message,
          time: nowLabel(),
          id: crypto.randomUUID(),
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Location access denied. Please allow location permission and try again.",
          time: nowLabel(),
          id: crypto.randomUUID(),
          error: true,
        },
      ]);
    } finally {
      setLocating(false);
    }
  }, [userLocation, getLocation]);

  /* Find safe places */
  const findNearbySafePlaces = useCallback(async () => {
    setLocating(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: "Find nearby safe places", time: nowLabel(), id: crypto.randomUUID() },
    ]);
    try {
      const loc = userLocation || (await getLocation());
      setFindingPlaces(true);
      const places = await getSafePlaces(loc.lat, loc.lng, 5);
      setMessages((m) => [
        ...m,
        { role: "assistant", type: "places", places, time: nowLabel(), id: crypto.randomUUID() },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I couldn't fetch nearby safe places right now.",
          time: nowLabel(),
          id: crypto.randomUUID(),
          error: true,
        },
      ]);
    } finally {
      setLocating(false);
      setFindingPlaces(false);
    }
  }, [userLocation, getLocation]);

  /* Voice input */
  const toggleRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isRecording) { setIsRecording(false); return; }
    const recog = new SR();
    recog.lang = "en-US";
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setIsRecording(false);
    };
    recog.onerror = () => setIsRecording(false);
    recog.onend = () => setIsRecording(false);
    recog.start();
    setIsRecording(true);
  }, [isRecording]);

  const activeUrgency = URGENCY_CONFIG[urgency];

  return (
    <div className="pb-10 flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] relative">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-red-500/10 blur-[140px]" />
      </div>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100 flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30">
              <MessageSquareWarning size={16} className="text-cyan-400" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            </span>
            Emergency Assistant
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium tracking-wide">
              ● LIVE
            </span>
          </h1>
          <p className="text-sm text-ink-500 mt-1.5">
            Quick, clear safety guidance + nearest emergency services — not a replacement for emergency services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userLocation && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <LocateFixed size={12} /> Location active
            </span>
          )}
          <button
            onClick={() => setTtsEnabled((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              ttsEnabled
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                : "border-white/10 text-ink-500 hover:text-ink-300"
            }`}
          >
            {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            {ttsEnabled ? "Voice on" : "Voice off"}
          </button>
          <StatusPill isFallback={lastWasFallback} />
        </div>
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        
        {/* ─── LEFT: Chat Card ─── */}
        <div className="flex flex-col min-h-0 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          
          {/* Urgency banner */}
          <AnimatePresence mode="popLayout">
            {activeUrgency && (
              <motion.div
                key={urgency}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`shrink-0 border-b px-5 py-3 flex flex-wrap items-center gap-3 text-sm font-medium ${activeUrgency.bg} ${activeUrgency.border} ${activeUrgency.text} ${activeUrgency.glow}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-black/20 ${activeUrgency.pulse ? "animate-pulse" : ""}`}>
                    <activeUrgency.icon size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold tracking-wide text-xs">{activeUrgency.label}</span>
                    <span className="text-xs opacity-80 font-normal">{activeUrgency.sub}</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs">
                  <a href="tel:1122" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors font-medium">
                    <PhoneCall size={11} /> Call 1122
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ SCROLLABLE MESSAGES AREA ═══ */}
          <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">
            {messages.map((m) => (
              <div key={m.id}>
                {m.type === "services" ? (
                  <EmergencyServicesPanel services={m.services} userLocation={m.userLocation} time={m.time} />
                ) : m.type === "places" ? (
                  <SafePlacesTable places={m.places} time={m.time} />
                ) : m.type === "location" ? (
                  <LocationCard location={m.location} mapsLink={m.mapsLink} time={m.time} />
                ) : (
                  <ChatBubble message={m} onSpeak={() => speak(m.content)} />
                )}
              </div>
            ))}

            <AnimatePresence>
              {(typing || findingPlaces || locating) && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10">
                    <TypingDots />
                    <span className="text-xs text-ink-500">
                      {locating ? "Locating you..." : findingPlaces ? "Searching nearby..." : "Assistant is thinking..."}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* ═══ BOTTOM CONTROLS (fixed, shrink-0) ═══ */}
          <div className="shrink-0 border-t border-white/5 bg-black/20">
            
            {/* Action chips
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
              <ActionChip icon={Siren} label="All services" onClick={() => findEmergencyServices("ALL")} primary />
              <ActionChip icon={Building2} label="Police" onClick={() => findEmergencyServices("POLICE")} />
              <ActionChip icon={Hospital} label="Hospital" onClick={() => findEmergencyServices("HOSPITAL")} />
              <ActionChip icon={Flame} label="Fire" onClick={() => findEmergencyServices("FIRE_STATION")} />
              <ActionChip icon={LocateFixed} label="Share location" onClick={shareLiveLocation} />
              <ActionChip icon={MapPinned} label="Safe places" onClick={findNearbySafePlaces} />
            </div> */}

            {/* Quick prompts */}
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="group text-xs px-3 py-1.5 rounded-full border border-white/10 text-ink-300 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex items-center gap-1.5"
                >
                  <qp.icon size={11} />
                  {qp.label}
                </button>
              ))}
              {suggestions.slice(0, 2).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-ink-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="p-4 pt-2 flex items-center gap-2.5"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your situation or ask for nearby help..."
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-4 pr-11 py-3 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "text-ink-500 hover:text-ink-200 hover:bg-white/5"
                  }`}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-base-950 flex items-center justify-center hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-cyan-500/20"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* ─── RIGHT: Sidebar ─── */}
        <div className="hidden lg:flex flex-col min-h-0 overflow-y-auto pr-1">
          <AssistantSidebar userLocation={userLocation} onEmergency={findEmergencyServices} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-ink-500 shrink-0">
        <ShieldAlert size={13} />
        This assistant provides general safety guidance only. In a real emergency, call your local emergency number.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

/* ═══════════════════════════════════════════════════════════════
   STATUS PILL
   ═══════════════════════════════════════════════════════════════ */

function StatusPill({ isFallback }) {
  if (isFallback === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 text-ink-500">
        <CircleDot size={12} className="text-cyan-400" /> Ready
      </span>
    );
  }
  return isFallback ? (
    <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
      <WifiOff size={12} /> Offline mode
    </motion.span>
  ) : (
    <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
      <Wifi size={12} /> AI-connected
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACTION CHIP
   ═══════════════════════════════════════════════════════════════ */

function ActionChip({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`group text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 hover:scale-[1.03] active:scale-95 ${
        primary
          ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 shadow-lg shadow-red-500/10"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
      }`}
    >
      <Icon size={12} />
      {label}
      <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMERGENCY SERVICES PANEL
   ═══════════════════════════════════════════════════════════════ */

function EmergencyServicesPanel({ services, userLocation, time }) {
  const [filter, setFilter] = useState("ALL");

  const grouped = useMemo(() => {
    const g = {};
    services.forEach((s) => {
      const t = s.type || "OTHER";
      if (!g[t]) g[t] = [];
      g[t].push(s);
    });
    return g;
  }, [services]);

  const availableTypes = Object.keys(grouped);
  const filtered = filter === "ALL" ? services : services.filter((s) => s.type === filter);
  const mapsLink = userLocation && `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[95%]">
      <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
        <div className="h-6 w-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <Siren size={12} className="text-red-400" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
          Nearest Emergency Services
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
          {services.length} found
        </span>
        {mapsLink && (
          <a href={mapsLink} target="_blank" rel="noreferrer"
            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1">
            <Navigation size={10} /> Your location
          </a>
        )}
        <span className="text-[10px] text-ink-600 ml-auto flex items-center gap-1">
          <Clock size={10} /> {time}
        </span>
      </div>

      {availableTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3 px-1">
          <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} label={`All (${services.length})`} />
          {availableTypes.map((t) => {
            const cfg = SERVICE_TYPES[t] || SERVICE_TYPES.OTHER;
            return (
              <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}
                label={`${cfg.label} (${grouped[t].length})`} />
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((service, i) => (
          <ServiceCard key={i} service={service} index={i} userLocation={userLocation} />
        ))}
      </div>

      {services.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <MapPinned size={24} className="mx-auto text-ink-600 mb-2" />
          <p className="text-sm text-ink-400">No emergency services found nearby.</p>
          <p className="text-xs text-ink-600 mt-1">Try expanding your search radius or call 1122 directly.</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
        <AlertTriangle size={14} className="text-red-400 shrink-0" />
        <p className="text-xs text-red-300 flex-1">
          For immediate danger, call <strong>1122</strong> — don't wait for the assistant.
        </p>
        <a href="tel:1122" className="text-xs px-3 py-1 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">
          Call now
        </a>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SERVICE CARD
   ═══════════════════════════════════════════════════════════════ */

function ServiceCard({ service, index, userLocation }) {
  const cfg = SERVICE_TYPES[service.type] || SERVICE_TYPES.OTHER;
  const Icon = cfg.icon;

  const directionsLink =
    userLocation && service.lat && service.lng
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${service.lat},${service.lng}`
      : null;

  const mapLink = service.lat && service.lng ? `https://www.google.com/maps?q=${service.lat},${service.lng}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3.5 hover:bg-white/[0.04] transition-all group`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 h-10 w-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center group-hover:scale-105 transition-transform`}>
          <Icon size={18} className={cfg.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-ink-100 truncate">{service.name || "Unnamed"}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border} font-medium uppercase tracking-wide`}>
              {cfg.label}
            </span>
            {service.distance_km != null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium ml-auto">
                {service.distance_km < 1 ? `${(service.distance_km * 1000).toFixed(0)} m` : `${service.distance_km.toFixed(1)} km`}
              </span>
            )}
          </div>

          {service.address && (
            <p className="text-xs text-ink-500 mt-1 truncate flex items-center gap-1">
              <MapPinned size={10} /> {service.address}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {service.phone && (
              <a href={`tel:${service.phone}`}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  service.type === "POLICE"
                    ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                    : service.type === "HOSPITAL"
                    ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    : "bg-white/10 text-ink-200 hover:bg-white/20"
                }`}>
                <PhoneCall size={11} /> {service.phone}
              </a>
            )}
            {directionsLink && (
              <a href={directionsLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 text-ink-300 hover:bg-white/10 transition-colors">
                <Navigation size={11} /> Directions
              </a>
            )}
            {mapLink && (
              <a href={mapLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-ink-500 hover:text-ink-300 transition-colors">
                <ExternalLink size={11} /> Map
              </a>
            )}
            {service.open_now === false && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">Closed</span>
            )}
            {service.open_now === true && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Open now</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILTER CHIP
   ═══════════════════════════════════════════════════════════════ */

function FilterChip({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
        active
          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-medium"
          : "border-white/10 text-ink-500 hover:text-ink-300 hover:border-white/20"
      }`}>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOCATION CARD
   ═══════════════════════════════════════════════════════════════ */

function LocationCard({ location, mapsLink, time }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[85%]">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <LocateFixed size={11} className="text-emerald-400" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">Shared Location</span>
        <span className="text-[10px] text-ink-600 ml-auto flex items-center gap-1">
          <Clock size={10} /> {time}
        </span>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <MapPinned size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-100">Your live location</p>
            <p className="text-xs text-ink-500 font-mono mt-0.5">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>
        </div>
        <a href={mapsLink} target="_blank" rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 text-xs py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-medium">
          <Navigation size={12} /> Open in Google Maps <ExternalLink size={11} />
        </a>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHAT BUBBLE
   ═══════════════════════════════════════════════════════════════ */

function parseStructuredReply(content) {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const steps = [], intro = [], outro = [];
  let seenSteps = false;
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s+(.*)/);
    if (match) { steps.push(match[2]); seenSteps = true; }
    else if (!seenSteps) intro.push(line);
    else outro.push(line);
  }
  return { intro: intro.join(" "), steps, outro: outro.join(" ") };
}

function ChatBubble({ message, onSpeak }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { intro, steps, outro } = !isUser ? parseStructuredReply(message.content) : { steps: [] };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
    >
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles size={10} className="text-cyan-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Safety Assistant</span>
            {message.isFallback && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">offline</span>
            )}
          </div>
        )}

        <div className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/30 text-ink-100 rounded-tr-sm"
            : message.error
            ? "bg-red-500/10 border border-red-500/30 text-red-300 rounded-tl-sm"
            : "bg-white/5 border border-white/10 text-ink-200 rounded-tl-sm"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : steps.length > 0 ? (
            <div className="space-y-3">
              {intro && <p className="text-ink-300">{intro}</p>}
              <ol className="space-y-2.5">
                {steps.map((step, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }} className="flex gap-3 items-start">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-ink-200 pt-0.5">{step}</span>
                  </motion.li>
                ))}
              </ol>
              {outro && <p className="text-ink-400 text-xs italic">{outro}</p>}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{renderMarkdown(message.content)}</p>
          )}
        </div>

        <div className={`flex items-center gap-2 mt-1.5 px-1 text-[10px] text-ink-600 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="flex items-center gap-1"><Clock size={10} /> {message.time}</span>
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleCopy} className="p-1 rounded hover:bg-white/5 hover:text-ink-300 transition-colors">
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              </button>
              {onSpeak && (
                <button onClick={onSpeak} className="p-1 rounded hover:bg-white/5 hover:text-ink-300 transition-colors">
                  <Volume2 size={10} />
                </button>
              )}
              <button onClick={() => setFeedback("up")}
                className={`p-1 rounded hover:bg-white/5 transition-colors ${feedback === "up" ? "text-emerald-400" : "hover:text-ink-300"}`}>
                <ThumbsUp size={10} />
              </button>
              <button onClick={() => setFeedback("down")}
                className={`p-1 rounded hover:bg-white/5 transition-colors ${feedback === "down" ? "text-rose-400" : "hover:text-ink-300"}`}>
                <ThumbsDown size={10} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-ink-100 font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* ═══════════════════════════════════════════════════════════════
   TYPING DOTS
   ═══════════════════════════════════════════════════════════════ */

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-cyan-400/70"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SAFE PLACES TABLE
   ═══════════════════════════════════════════════════════════════ */

function SafePlacesTable({ places, time }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[95%]">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Navigation size={10} className="text-emerald-400" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">Nearby Safe Places</span>
        <span className="text-[10px] text-ink-600 ml-auto flex items-center gap-1"><Clock size={10} /> {time}</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {places.length === 0 ? (
          <div className="p-4 text-sm text-ink-500 text-center">No safe places found nearby.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-500 font-medium">Place</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-500 font-medium hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-500 font-medium">Distance</th>
              </tr>
            </thead>
            <tbody>
              {places.map((p, i) => {
                const cfg = SERVICE_TYPES[p.type] || SERVICE_TYPES.OTHER;
                const Icon = cfg.icon;
                return (
                  <motion.tr key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center shrink-0`}>
                          <Icon size={14} className={cfg.color} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-ink-100 font-medium truncate">{p.name}</div>
                          {p.address && <div className="text-[11px] text-ink-500 truncate">{p.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-400">{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.distance_km != null ? (
                        <span className="text-emerald-400 font-medium text-sm">{p.distance_km.toFixed(1)} km</span>
                      ) : (
                        <span className="text-ink-600">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════ */

function AssistantSidebar({ userLocation, onEmergency }) {
  return (
    <>
      {/* Location card */}
      {userLocation ? (
        <GlassCard className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <LocateFixed size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Location Active</span>
          </div>
          <p className="text-xs text-ink-400 font-mono">
            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </p>
          <a href={`https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`}
            target="_blank" rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline">
            View on map <ExternalLink size={10} />
          </a>
        </GlassCard>
      ) : (
        <GlassCard className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <LocateFixed size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Location Needed</span>
          </div>
          <p className="text-xs text-ink-400">Enable location to find nearest emergency services.</p>
        </GlassCard>
      )}

      {/* Quick emergency call */}
      <GlassCard className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
        <h3 className="font-display text-sm font-medium text-ink-100 mb-2.5 flex items-center gap-2">
          <Siren size={15} className="text-red-400" /> Quick Emergency
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:1122" className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors">
            <PhoneCall size={14} />
            <span className="text-[10px] font-semibold">Rescue</span>
            <span className="text-[10px] font-mono">1122</span>
          </a>
          <a href="tel:15" className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors">
            <Building2 size={14} />
            <span className="text-[10px] font-semibold">Police</span>
            <span className="text-[10px] font-mono">15</span>
          </a>
        </div>
      </GlassCard>

      {/* Find services */}
      <GlassCard>
        <h3 className="font-display text-sm font-medium text-ink-100 mb-3 flex items-center gap-2">
          <MapPinned size={15} className="text-cyan-400" /> Find nearest
        </h3>
        <div className="space-y-1.5">
          {[
            { type: "POLICE", icon: Building2, label: "Police Stations", color: "text-blue-400" },
            { type: "HOSPITAL", icon: Hospital, label: "Hospitals", color: "text-red-400" },
            { type: "FIRE_STATION", icon: Flame, label: "Fire Stations", color: "text-orange-400" },
          ].map((item) => (
            <button key={item.type} onClick={() => onEmergency(item.type)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group">
              <item.icon size={14} className={item.color} />
              <span className="text-xs text-ink-300 group-hover:text-ink-100">{item.label}</span>
              <ChevronRight size={12} className="ml-auto text-ink-600 group-hover:text-cyan-400 transition-colors" />
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Capabilities */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
        <h3 className="font-display text-sm font-medium text-ink-100 mb-3 flex items-center gap-2">
          <ClipboardList size={15} className="text-cyan-400" /> What I can help with
        </h3>
        <div className="space-y-2">
          {CAPABILITIES.map((c) => (
            <div key={c.label} className="flex items-center gap-2.5 text-xs text-ink-300 group cursor-default">
              <c.icon size={13} className={`${c.color} shrink-0 group-hover:scale-110 transition-transform`} />
              {c.label}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* All emergency numbers */}
      <GlassCard>
        <h3 className="font-display text-sm font-medium text-ink-100 mb-3 flex items-center gap-2">
          <PhoneCall size={15} className="text-red-400" /> All Emergency Numbers
        </h3>
        <div className="space-y-1">
          {PK_EMERGENCY_NUMBERS.map((n) => (
            <a key={n.number} href={`tel:${n.number}`}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 transition-colors group">
              <div className="min-w-0">
                <div className="text-xs text-ink-300 group-hover:text-ink-100 truncate">{n.name}</div>
                <div className="text-[10px] text-ink-600">{n.tag}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-medium text-cyan-400">{n.number}</span>
                {n.urgent && <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
              </div>
            </a>
          ))}
        </div>
      </GlassCard>

      {/* Pro tip */}
      <GlassCard className="bg-gradient-to-br from-cyan-500/5 to-transparent">
        <h3 className="font-display text-sm font-medium text-ink-100 mb-2 flex items-center gap-2">
          <Zap size={15} className="text-amber-400" /> Pro tip
        </h3>
        <p className="text-xs text-ink-400 leading-relaxed">
          Be specific: mention your <strong>location</strong>, <strong>number of people</strong>, and any <strong>injuries</strong>.
          The more detail, the better the guidance.
        </p>
      </GlassCard>
    </>
  );
}
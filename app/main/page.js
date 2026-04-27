"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Briefcase, CheckCircle2, XCircle, Clock, Award,
  TrendingUp, ArrowRight, RefreshCw, Loader2,
  FileText, ChevronRight, AlertCircle, Sparkles
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────
const STATUS = {
  applied:     { label: "Applied",           icon: Clock,        style: "bg-blue-50   text-blue-700   border-blue-200"   },
  ai_selected: { label: "AI Shortlisted",    icon: Sparkles,     style: "bg-green-50  text-green-700  border-green-200"  },
  ai_rejected: { label: "Not Shortlisted",   icon: XCircle,      style: "bg-red-50    text-red-600    border-red-200"    },
  hr_selected: { label: "Offer Received",    icon: Award,        style: "bg-purple-50 text-purple-700 border-purple-200" },
  hr_rejected: { label: "Not Selected",      icon: XCircle,      style: "bg-slate-100 text-slate-600  border-slate-200"  },
};

const getStatus = (s) => STATUS[s] ?? { label: s, icon: Clock, style: "bg-slate-100 text-slate-600 border-slate-200" };

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  const accents = {
    blue:   "border-t-blue-500   text-blue-600",
    orange: "border-t-orange-400 text-orange-500",
    green:  "border-t-emerald-500 text-emerald-600",
    purple: "border-t-purple-500  text-purple-600",
  };
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-t-4 ${accents[accent].split(" ")[0]} p-5 shadow-sm`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-4xl font-extrabold ${accents[accent].split(" ")[1]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function Empty({ message, sub, cta, href }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700 mb-1">{message}</p>
      {sub && <p className="text-sm text-slate-400 mb-4">{sub}</p>}
      {cta && href && (
        <Link href={href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          {cta} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Application row ──────────────────────────────────────────
function AppRow({ app }) {
  const cfg     = getStatus(app.status);
  const Icon    = cfg.icon;
  const date    = new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors border border-slate-200">
          <Briefcase className="w-4 h-4 text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {app.jobId?.jobTitle || "Position"}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {app.jobId?.companyName || "Company"} · {date}
          </p>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ml-3 ${cfg.style}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Progress funnel ──────────────────────────────────────────
function Funnel({ stats }) {
  const total = stats.totalApplications || 1;
  const steps = [
    { label: "Applied",        value: stats.totalApplications, color: "bg-blue-500",    pct: 100 },
    { label: "Under Review",   value: stats.pendingReview,     color: "bg-orange-400",  pct: Math.round(((stats.pendingReview || 0) / total) * 100) },
    { label: "AI Shortlisted", value: stats.aiShortlisted,     color: "bg-emerald-500", pct: Math.round(((stats.aiShortlisted || 0) / total) * 100) },
    { label: "Offers",         value: stats.finalSelected,     color: "bg-purple-500",  pct: Math.round(((stats.finalSelected || 0) / total) * 100) },
  ];

  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
            <span>{s.label}</span>
            <span className="font-bold text-slate-700">{s.value ?? 0}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${s.color}`}
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────
export default function MainDashboard() {
  const router  = useRouter();

  const [user,          setUser]          = useState(null);
  const [applications,  setApplications]  = useState([]);
  const [stats,         setStats]         = useState({ totalApplications: 0, pendingReview: 0, aiShortlisted: 0, finalSelected: 0 });
  const [pageState,     setPageState]     = useState("loading");   // "loading" | "ready" | "error"
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState("");

  // ── fetch all data ──
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");

    try {
      // All 3 fetches in parallel
      const [authRes, appsRes, statsRes] = await Promise.all([
        fetch("/api/auth/user",                         { credentials: "include" }),
        fetch("/api/user/applications?limit=5&sort=-createdAt", { credentials: "include" }),
        fetch("/api/user/stats",                        { credentials: "include" }),
      ]);

      // Auth check
      if (!authRes.ok) {
        router.push("/login");
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);

      // Applications
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        if (appsData.success) setApplications(appsData.applications ?? []);
      }

      // Stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.stats ?? stats);
      }

      setPageState("ready");
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data.");
      setPageState("error");
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── loading ──
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── error ──
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-800 mb-1">Something went wrong</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => fetchData()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── derive shortcut values ──
  const firstName      = user?.name?.split(" ")[0] ?? "there";
  const hasApps        = applications.length > 0;
  const shortlistRate  = stats.totalApplications
    ? Math.round((stats.aiShortlisted / stats.totalApplications) * 100)
    : 0;

  // ── ready ──
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Good {getGreeting()}, {firstName} 👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Here's a live snapshot of your job search.
              </p>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Applied"
              value={stats.totalApplications}
              sub="Jobs applied to"
              accent="blue"
            />
            <StatCard
              label="Under Review"
              value={stats.pendingReview ?? 0}
              sub="Awaiting AI screening"
              accent="orange"
            />
            <StatCard
              label="AI Shortlisted"
              value={stats.aiShortlisted ?? 0}
              sub={`${shortlistRate}% shortlist rate`}
              accent="green"
            />
            <StatCard
              label="Offers"
              value={stats.finalSelected ?? 0}
              sub="Final selections"
              accent="purple"
            />
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent applications — takes 2 cols */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Recent Applications
                </h2>
                {hasApps && (
                  <Link href="/profile"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="p-3">
                {hasApps ? (
                  <div className="divide-y divide-slate-50">
                    {applications.map((app) => (
                      <AppRow key={app._id} app={app} />
                    ))}
                  </div>
                ) : (
                  <Empty
                    message="No applications yet"
                    sub="Start applying to jobs and track your progress here."
                    cta="Browse jobs"
                    href="/jobs"
                  />
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">

              {/* Application funnel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Application Funnel
                </h2>
                {stats.totalApplications > 0 ? (
                  <Funnel stats={stats} />
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">
                    Apply to jobs to see your funnel.
                  </p>
                )}
              </div>

              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-bold text-slate-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  {[
                    { label: "Browse Jobs",      sub: "Find new opportunities",      href: "/jobs",    icon: Briefcase,    color: "text-blue-600   bg-blue-50"   },
                    { label: "Update Profile",   sub: "Keep your info current",       href: "/profile", icon: FileText,     color: "text-slate-600  bg-slate-100" },
                    { label: "My Applications",  sub: "Full application history",     href: "/profile", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
                  ].map(({ label, sub, href, icon: Icon, color }) => (
                    <Link key={label} href={href}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{label}</p>
                        <p className="text-xs text-slate-400">{sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Tips — only shown when no applications ── */}
          {!hasApps && (
            <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-900 mb-4">Get Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Complete your profile", body: "Add your resume, skills, and work experience so employers can find you.", color: "bg-blue-600" },
                  { step: "2", title: "Browse & apply",        body: "Explore job listings and apply with one click. AI screens your fit instantly.", color: "bg-emerald-600" },
                  { step: "3", title: "Track progress",        body: "Monitor each application's status — from applied to offer received — right here.", color: "bg-purple-600" },
                ].map(({ step, title, body, color }) => (
                  <div key={step} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${color}`}>
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
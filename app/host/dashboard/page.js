"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Users, Award, Eye,
  Briefcase, CheckCircle, Calendar, Plus,
  Loader2, AlertCircle, RefreshCw, ChevronRight
} from "lucide-react";
import Navbar from "@/components/Host/Navbar";
import Footer from "@/components/Footer";

// ─── Status badge config ──────────────────────────────────────
const JOB_STATUS = {
  draft:              { label: "Draft",              style: "bg-yellow-50  text-yellow-700  border-yellow-200"  },
  published:          { label: "Published",          style: "bg-green-50   text-green-700   border-green-200"   },
  applications_open:  { label: "Open",               style: "bg-blue-50    text-blue-700    border-blue-200"    },
  interviews_active:  { label: "Interviewing",       style: "bg-purple-50  text-purple-700  border-purple-200"  },
  completed:          { label: "Completed",          style: "bg-slate-100  text-slate-600   border-slate-200"   },
  cancelled:          { label: "Cancelled",          style: "bg-red-50     text-red-600     border-red-200"     },
};

const APP_STATUS = {
  applied:              { label: "Applied",          style: "bg-blue-50    text-blue-700"   },
  ai_selected:          { label: "AI Shortlisted",  style: "bg-green-50   text-green-700"  },
  ai_rejected:          { label: "Not Shortlisted", style: "bg-red-50     text-red-600"    },
  hr_selected:          { label: "Selected",         style: "bg-purple-50  text-purple-700" },
  hr_rejected:          { label: "Not Selected",     style: "bg-slate-100  text-slate-600"  },
  interview_completed:  { label: "Interviewed",      style: "bg-indigo-50  text-indigo-700" },
};

const getJobStatus = (s) =>
  JOB_STATUS[s] ?? { label: s, style: "bg-slate-100 text-slate-600 border-slate-200" };

const getAppStatus = (s) =>
  APP_STATUS[s] ?? { label: s, style: "bg-slate-100 text-slate-600" };

// ─── Metric card ──────────────────────────────────────────────
function MetricCard({ title, value, sub, icon: Icon, accent }) {
  const styles = {
    blue:   { wrap: "border-t-blue-500",    icon: "bg-blue-50   text-blue-600"   },
    green:  { wrap: "border-t-emerald-500", icon: "bg-emerald-50 text-emerald-600" },
    purple: { wrap: "border-t-purple-500",  icon: "bg-purple-50 text-purple-600" },
    orange: { wrap: "border-t-orange-400",  icon: "bg-orange-50 text-orange-500" },
  };
  const s = styles[accent] ?? styles.blue;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-t-4 ${s.wrap} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-4xl font-extrabold text-slate-900">{value ?? 0}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${s.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function Empty({ icon: Icon, message, sub, cta, href }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 mb-3">{sub}</p>}
      {cta && href && (
        <Link href={href}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          {cta} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function HostDashboardPage() {
  const router = useRouter();

  const [analytics,           setAnalytics]           = useState(null);
  const [recentJobs,          setRecentJobs]          = useState([]);
  const [recentApplications,  setRecentApplications]  = useState([]);
  const [selectedPeriod,      setSelectedPeriod]      = useState("30d");
  const [pageState,           setPageState]           = useState("loading");
  const [refreshing,          setRefreshing]          = useState(false);
  const [error,               setError]               = useState("");

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");

    try {
      const [analyticsRes, jobsRes, appsRes] = await Promise.all([
        fetch(`/api/host/jobs/analytics?period=${selectedPeriod}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/host/jobs/list?limit=5", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/host/jobs/applications/recent?limit=5", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      // Auth check on any 401/403
      if (
        analyticsRes.status === 401 || analyticsRes.status === 403 ||
        jobsRes.status      === 401 || jobsRes.status      === 403
      ) {
        router.push("/login");
        return;
      }

      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        if (d.success) setAnalytics(d.analytics);
      }

      if (jobsRes.ok) {
        const d = await jobsRes.json();
        if (d.success) setRecentJobs(d.jobs ?? []);
      }

      if (appsRes.ok) {
        const d = await appsRes.json();
        if (d.success) setRecentApplications(d.applications ?? []);
      }

      setPageState("ready");
    } catch (err) {
      setError("Failed to load dashboard. Please try again.");
      setPageState("error");
    } finally {
      setRefreshing(false);
    }
  }, [selectedPeriod, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Loading ──
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm px-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-800 mb-1">Something went wrong</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => fetchAll()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived values from real DB data ──
  const shortlistRate = analytics?.totalApplications
    ? Math.round((analytics.aiShortlisted / analytics.totalApplications) * 100)
    : 0;

  const hireRate = analytics?.aiShortlisted
    ? Math.round((analytics.successfulHires / analytics.aiShortlisted) * 100)
    : 0;

  // ── Ready ──
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Your recruitment overview</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-60 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <Link
                href="/host/create-job"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Post Job
              </Link>
            </div>
          </div>

          {/* Metric cards — all real data from analytics API */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Jobs Posted"
              value={analytics?.totalJobs}
              sub={`${selectedPeriod} period`}
              icon={Briefcase}
              accent="blue"
            />
            <MetricCard
              title="Total Applications"
              value={analytics?.totalApplications}
              sub={`${shortlistRate}% shortlist rate`}
              icon={Users}
              accent="green"
            />
            <MetricCard
              title="AI Shortlisted"
              value={analytics?.aiShortlisted}
              sub={`${hireRate}% hire rate`}
              icon={CheckCircle}
              accent="purple"
            />
            <MetricCard
              title="Successful Hires"
              value={analytics?.successfulHires}
              sub="Final selections"
              icon={Award}
              accent="orange"
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Recent Jobs — 2 cols */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Recent Jobs
                </h3>
                <Link href="/host/jobs"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-slate-50 p-2">
                {recentJobs.length > 0 ? recentJobs.map((job) => {
                  const cfg = getJobStatus(job.status);
                  return (
                    <div key={job._id} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{job.jobTitle}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {job.currentApplications ?? 0} applications
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(job.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.style}`}>
                          {cfg.label}
                        </span>
                        <Link href={`/host/jobs/${job._id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          View
                        </Link>
                      </div>
                    </div>
                  );
                }) : (
                  <Empty
                    icon={Briefcase}
                    message="No jobs posted yet"
                    sub="Create your first job to start hiring"
                    cta="Post a job"
                    href="/host/create-job"
                  />
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: "Post New Job",        href: "/host/create-job",  icon: Plus,     style: "bg-blue-600 hover:bg-blue-700 text-white" },
                  { label: "View All Jobs",        href: "/host/jobs",        icon: Eye,      style: "bg-slate-100 hover:bg-slate-200 text-slate-700" },
                  { label: "Manage Candidates",   href: "/host/candidates",  icon: Users,    style: "bg-slate-100 hover:bg-slate-200 text-slate-700" },
                ].map(({ label, href, icon: Icon, style }) => (
                  <Link key={label} href={href}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${style}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>

              {/* Conversion summary */}
              {analytics?.totalApplications > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Pipeline Summary</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Applied",     value: analytics.totalApplications,  color: "bg-blue-500"    },
                      { label: "Shortlisted", value: analytics.aiShortlisted ?? 0, color: "bg-purple-500"  },
                      { label: "Hired",       value: analytics.successfulHires ?? 0, color: "bg-emerald-500" },
                    ].map(({ label, value, color }) => {
                      const pct = analytics.totalApplications
                        ? Math.round((value / analytics.totalApplications) * 100)
                        : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{label}</span>
                            <span className="font-semibold text-slate-700">{value}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top performing jobs — real data from analytics */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Top Performing Jobs
                </h3>
              </div>
              <div className="p-3">
                {analytics?.topJobs?.length > 0 ? analytics.topJobs.map((job, i) => (
                  <div key={job._id ?? i}
                    className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{job.jobTitle}</p>
                        <p className="text-xs text-slate-400">{job.applications} applications</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex-shrink-0 ml-3">
                      {job.conversionRate ?? 0}% conversion
                    </span>
                  </div>
                )) : (
                  <Empty
                    icon={BarChart3}
                    message="No performance data yet"
                    sub="Post jobs and receive applications to see analytics"
                  />
                )}
              </div>
            </div>

            {/* Recent applications — real scores from DB */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Recent Applications
                </h3>
                <Link href="/host/candidates"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50 p-2">
                {recentApplications.length > 0 ? recentApplications.map((app) => {
                  const cfg = getAppStatus(app.status);
                  return (
                    <div key={app._id} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {app.userId?.name ?? "Candidate"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {app.jobId?.jobTitle ?? "Position"}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.style}`}>
                          {cfg.label}
                        </span>
                        {/* Real scores from DB — only show if they exist */}
                        <div className="flex gap-2 mt-1 justify-end">
                          {app.atsScore != null && (
                            <span className="text-[11px] font-bold text-purple-600">R1: {app.atsScore}%</span>
                          )}
                          {app.voiceInterviewScore != null && (
                            <span className="text-[11px] font-bold text-blue-600">R2: {app.voiceInterviewScore}%</span>
                          )}
                          {app.finalScore != null && (
                            <span className="text-[11px] font-bold text-emerald-600">Final: {app.finalScore}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <Empty
                    icon={Users}
                    message="No recent applications"
                    sub="Applications will appear here once candidates apply"
                  />
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
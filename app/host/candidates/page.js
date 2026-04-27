"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Host/Navbar";
import Footer from "@/components/Footer";
import {
  Users, Briefcase, CheckCircle2, Award,
  Video, ArrowRight, Loader2, AlertCircle,
  RefreshCw, Plus, ChevronRight
} from "lucide-react";

// ── Stat pill ─────────────────────────────────────────────────
function Stat({ value, label, color }) {
  const colors = {
    slate:  "text-slate-800",
    blue:   "text-blue-600",
    green:  "text-emerald-600",
    purple: "text-purple-600",
  };
  return (
    <div className="text-center">
      <p className={`text-2xl font-extrabold ${colors[color] ?? colors.slate}`}>{value ?? 0}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────
function JobCard({ job }) {
  const shortlisted = job.shortlistedCandidates?.length ?? 0;
  const selected    = job.finalSelectedCandidates?.length ?? 0;
  const interviews  = job.completedInterviews ?? 0;
  const total       = job.currentApplications ?? 0;

  // Shortlist rate
  const rate = total > 0 ? Math.round((shortlisted / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate">{job.jobTitle}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {job.jobType ?? "Full-time"}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <Link
          href={`/host/jobs/${job._id}/candidates`}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 py-3 border-t border-slate-100">
        <Stat value={total}       label="Applied"     color="slate"  />
        <Stat value={shortlisted} label="Shortlisted" color="blue"   />
        <Stat value={interviews}  label="Interviewed" color="green"  />
        <Stat value={selected}    label="Selected"    color="purple" />
      </div>

      {/* Shortlist rate bar */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Shortlist rate</span>
            <span className="font-semibold text-slate-600">{rate}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AllCandidatesPage() {
  const router = useRouter();

  const [jobs,      setJobs]      = useState([]);
  const [pageState, setPageState] = useState("loading"); // "loading" | "ready" | "error"
  const [error,     setError]     = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");

    try {
      const res = await fetch("/api/host/jobs/list", { credentials: "include" });

      // Auth check
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message ?? "Failed to load jobs");
      }

      // Show ALL jobs that have at least 1 application
      // (host sees full picture — even if no one shortlisted yet)
      const relevant = (data.jobs ?? []).filter(
        (job) => (job.currentApplications ?? 0) > 0
      );

      setJobs(relevant);
      setPageState("ready");
    } catch (err) {
      setError(err.message ?? "Something went wrong");
      setPageState("error");
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Total stats across all jobs ──
  const totals = jobs.reduce(
    (acc, job) => ({
      applications: acc.applications + (job.currentApplications ?? 0),
      shortlisted:  acc.shortlisted  + (job.shortlistedCandidates?.length ?? 0),
      interviews:   acc.interviews   + (job.completedInterviews ?? 0),
      selected:     acc.selected     + (job.finalSelectedCandidates?.length ?? 0),
    }),
    { applications: 0, shortlisted: 0, interviews: 0, selected: 0 }
  );

  // ── Loading ──
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading candidates…</p>
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
            <p className="font-semibold text-slate-800 mb-1">Failed to load</p>
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

  // ── Ready ──
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">All Candidates</h1>
              <p className="text-slate-500 text-sm mt-1">
                Candidates across {jobs.length} active job{jobs.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              <Link
                href="/host/create-job"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Job
              </Link>
            </div>
          </div>

          {/* Summary stats — only when there are jobs */}
          {jobs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { icon: Users,        label: "Total Applied",  value: totals.applications, color: "text-slate-700  bg-slate-100"  },
                { icon: CheckCircle2, label: "Shortlisted",    value: totals.shortlisted,  color: "text-blue-700   bg-blue-50"    },
                { icon: Video,        label: "Interviewed",    value: totals.interviews,   color: "text-emerald-700 bg-emerald-50" },
                { icon: Award,        label: "Selected",       value: totals.selected,     color: "text-purple-700 bg-purple-50"  },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-slate-900 leading-none">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Jobs list */}
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center px-4">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">No candidates yet</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                Post a job and candidates will appear here once they start applying.
              </p>
              <Link
                href="/host/create-job"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Your First Job
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
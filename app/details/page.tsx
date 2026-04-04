"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useHealthStatus } from "@/hooks/use-health-status";
import ServicesGrid from "@/components/services-grid";
import UptimeChart from "@/components/uptime-chart";
import IncidentHistory from "@/components/incident-history";

export default function DetailsPage() {
  const [activeTab, setActiveTab] = useState("services");
  const { lastUpdate } = useHealthStatus();

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <Link href="/" className="flex items-center gap-2 hover:text-zinc-400 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Back to status</span>
        </Link>
        <div className="text-xs text-zinc-500">Last updated {getTimeAgo(lastUpdate)}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex gap-8 border-b border-zinc-900 mb-8">
            <button
              onClick={() => setActiveTab("services")}
              className={`pb-4 text-sm font-medium transition-colors ${
                activeTab === "services"
                  ? "text-white border-b border-white"
                  : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab("uptime")}
              className={`pb-4 text-sm font-medium transition-colors ${
                activeTab === "uptime"
                  ? "text-white border-b border-white"
                  : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              Uptime
            </button>
            <button
              onClick={() => setActiveTab("incidents")}
              className={`pb-4 text-sm font-medium transition-colors ${
                activeTab === "incidents"
                  ? "text-white border-b border-white"
                  : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              Incident History
            </button>
          </div>

          {/* Services Tab */}
          {activeTab === "services" && (
            <div>
              <h2 className="text-lg font-semibold mb-6 uppercase tracking-wider text-zinc-300">Services</h2>
              <ServicesGrid />
            </div>
          )}

          {/* Uptime Tab */}
          {activeTab === "uptime" && (
            <div>
              <h2 className="text-lg font-semibold mb-6 uppercase tracking-wider text-zinc-300">Uptime</h2>
              <UptimeChart />
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === "incidents" && (
            <div>
              <h2 className="text-lg font-semibold mb-6 uppercase tracking-wider text-zinc-300">Incident History</h2>
              <IncidentHistory />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-900 text-xs text-zinc-600">
        <span>TurnOne Hub</span>
        <span>Powered by TurnOne Hub</span>
      </div>
    </div>
  );
}

"use client";

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface Update {
  status: "resolved" | "investigating" | "warning" | "scheduled";
  message: string;
  timestamp: string;
}

interface Incident {
  title: string;
  date: string;
  severity: "minor" | "major" | "critical";
  updates: Update[];
}

const incidents: Incident[] = [
  {
    title: "API Latency Increase - Production",
    date: "April 2, 2026",
    severity: "minor",
    updates: [
      {
        status: "resolved",
        message: "Issue has been resolved. API response times are back to normal.",
        timestamp: "16:45 UTC",
      },
      {
        status: "investigating",
        message: "A fix has been deployed. Monitoring for stability.",
        timestamp: "16:20 UTC",
      },
      {
        status: "warning",
        message: "Root cause identified: database connection pool exhaustion.",
        timestamp: "15:50 UTC",
      },
      {
        status: "investigating",
        message: "We are investigating increased latency on the Production API.",
        timestamp: "15:30 UTC",
      },
    ],
  },
  {
    title: "Mobile App - Push Notifications Delayed",
    date: "March 28, 2026",
    severity: "minor",
    updates: [
      {
        status: "resolved",
        message: "Push notification delivery is back to normal.",
        timestamp: "10:00 UTC",
      },
      {
        status: "investigating",
        message: "Third-party provider has acknowledged the issue.",
        timestamp: "09:15 UTC",
      },
      {
        status: "warning",
        message: "Investigating delayed push notifications on mobile.",
        timestamp: "08:45 UTC",
      },
    ],
  },
  {
    title: "Scheduled Maintenance - Database Migration",
    date: "March 20, 2026",
    severity: "major",
    updates: [
      {
        status: "resolved",
        message: "Maintenance completed. All services restored.",
        timestamp: "06:00 UTC",
      },
      {
        status: "scheduled",
        message: "Scheduled maintenance has begun. Some services may be temporarily unavailable.",
        timestamp: "04:00 UTC",
      },
    ],
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "resolved":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "investigating":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case "scheduled":
      return <Clock className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-500/20 border-red-500/50 text-red-400";
    case "major":
      return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
    case "minor":
      return "bg-amber-500/20 border-amber-500/50 text-amber-400";
    default:
      return "bg-zinc-500/20 border-zinc-500/50 text-zinc-400";
  }
};

export default function IncidentHistory() {
  return (
    <div className="space-y-4">
      {incidents.map((incident, idx) => (
        <div
          key={idx}
          className="border border-zinc-900 rounded-lg p-6 hover:border-zinc-800 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white mb-1">{incident.title}</h3>
              <p className="text-xs text-zinc-500">{incident.date}</p>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full border font-medium whitespace-nowrap ${getSeverityColor(
                incident.severity
              )}`}
            >
              {incident.severity}
            </span>
          </div>

          <div className="space-y-3">
            {incident.updates.map((update, updateIdx) => (
              <div key={updateIdx} className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(update.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{update.message}</p>
                  <p className="text-xs text-zinc-500 mt-1">{update.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useHealthStatus } from "@/hooks/use-health-status";
import { Loader } from "lucide-react";
import { Cpu, Code } from "lucide-react";

const iconMap: Record<string, typeof Code> = {
  "Production API": Code,
  "Development API": Cpu,
};

const statusColor = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

const statusText = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

export default function ServicesGrid() {
  const { services, loading, error } = useHealthStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-6 h-6 animate-spin text-zinc-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Loading service status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => {
        const Icon = iconMap[service.name] || Code;
        return (
          <div
            key={service.name}
            className="border border-zinc-900 rounded-lg p-6 hover:border-zinc-800 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{service.name}</h3>
                  <p className="text-xs text-zinc-500">{service.endpoint}</p>
                </div>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full border ${statusColor[service.status]} w-fit whitespace-nowrap`}>
                <span className="text-black font-semibold">✓ {statusText[service.status]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Status</span>
                <span className={`text-sm font-semibold ${service.status === "operational" ? "text-green-500" : service.status === "degraded" ? "text-yellow-500" : "text-red-500"}`}>
                  {statusText[service.status]}
                </span>
              </div>
              <div className="bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${statusColor[service.status]}`}
                  style={{
                    width:
                      service.status === "operational"
                        ? "100%"
                        : service.status === "degraded"
                          ? "50%"
                          : "10%",
                  }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-900">
              <div>
                <p className="text-xs text-zinc-500">Response Time</p>
                <p className="text-sm font-semibold text-white">{service.response}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Version</p>
                <p className="text-sm font-semibold text-white">{service.version || "N/A"}</p>
              </div>
            </div>

            {service.checks && (
              <div className="mt-4 pt-4 border-t border-zinc-900 space-y-1">
                <p className="text-xs text-zinc-500 mb-2">Health Checks</p>
                {Object.entries(service.checks)
                  .filter(([, v]) => typeof v === "string")
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-zinc-300">{String(value)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useCallback, useState } from "react";
import { CheckCircle, ChevronDown, Cpu, Globe, Monitor, Smartphone, Code, Brain, ArrowRight, Book } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHealthStatus } from "@/hooks/use-health-status";
import { describe } from "node:test";

interface ServiceInfo {
  name: string;
  description: string;
  status: "operational" | "degraded" | "down";
  icon: typeof Globe;
  details: string[];
  isInternalOnly?: boolean;
}

const statusDot = {
  operational: "bg-success",
  degraded: "bg-degraded",
  down: "bg-destructive",
};

export default function ServicesDisplay() {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { services: healthServices, loading, error } = useHealthStatus();

  const services = useMemo<ServiceInfo[]>(() => {
    const iconMap: Record<string, typeof Globe> = {
      "Production API": Code,
      "Development API": Cpu,
      "Documentation": Book,
      "Web Platform": Globe,
    };

    // Real health services
    const realServices = healthServices.map((h) => ({
      name: h.name,
      description: `Operational · ${h.uptime}% uptime`,
      status: h.status,
      icon: iconMap[h.name] || Code,
      details: h.checks
        ? Object.entries(h.checks)
            .filter(([, v]) => typeof v === "string")
            .slice(0, 3)
            .map(([key, value]) => `${key}: ${value}`)
        : [`Response: ${h.response}`, `Version: ${h.version || "N/A"}`],
    }));

    // Mock services for other components
    const mockServices: ServiceInfo[] = [
      {
        name: "Mobile App",
        description: "iOS & Android · 99.95% uptime",
        status: "operational",
        icon: Smartphone,
        details: ["89ms avg response", "Push notifications active", "v4.2.1 latest"],
        isInternalOnly: true,
      },
      {
        name: "Desktop App",
        description: "Windows, macOS, Linux · 99.97% uptime",
        status: "operational",
        icon: Monitor,
        details: ["Native performance", "Auto-updates enabled", "v3.8.0 latest"],
        isInternalOnly: true,
      },
      {
        name: "AI Services",
        description: "ML inference & training · 99.90% uptime",
        status: "operational",
        icon: Brain,
        details: ["GPU clusters active", "Model v2.4 deployed", "Batch processing OK"],
        isInternalOnly: true,
      },
    ];

    return [...realServices, ...mockServices];
  }, [healthServices]);

  const toggle = useCallback(() => setExpanded((e) => !e), []);

  if (error && !loading) {
    return (
      <div className="w-full max-w-3xl mx-auto text-center">
        <div className="text-red-500 text-sm mb-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between gap-6">
      {/* Left Column */}
      <div className="hidden lg:flex flex-col gap-3 w-[200px] max-h-[600px] overflow-y-auto">
        {services.slice(0, Math.ceil(services.length / 2)).map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.name}
              className={`bg-card/50 border rounded-lg p-3 transition-all duration-300 cursor-default text-sm ${
                service.isInternalOnly
                  ? "border-amber-900/50 hover:border-amber-800/50"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{service.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDot[service.status]} shrink-0`} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{service.description}</p>
              {service.isInternalOnly && (
                <div className="inline-block px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-xs font-semibold text-amber-400">
                  INTERNAL
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile toggle for services */}
      <div className="lg:hidden flex flex-col items-center w-full">
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-muted-foreground text-xs group hover:text-foreground transition-colors"
        >
          <span>{expanded ? "Collapse" : "View services"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Expanded mobile grid */}
        {expanded && (
          <div className="w-full grid gap-3 sm:grid-cols-2 mt-4 px-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className={`bg-card/50 border rounded-lg p-4 transition-all duration-300 cursor-default ${
                    service.isInternalOnly
                      ? "border-amber-900/50 hover:border-amber-800/50"
                      : "border-border hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{service.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusDot[service.status]} shrink-0`} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                    </div>
                  </div>

                  {service.isInternalOnly && (
                    <div className="mb-2 inline-block px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded text-xs font-semibold text-amber-400">
                      INTERNAL ONLY
                    </div>
                  )}
                </div>
              );
            })}

            {/* Link to details page */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push("/details");
              }}
              className="sm:col-span-2 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/btn py-2"
            >
              <span>View full status details</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="hidden lg:flex flex-col gap-3 w-[200px] max-h-[600px] overflow-y-auto">
        {services.slice(Math.ceil(services.length / 2)).map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.name}
              className={`bg-card/50 border rounded-lg p-3 transition-all duration-300 cursor-default text-sm ${
                service.isInternalOnly
                  ? "border-amber-900/50 hover:border-amber-800/50"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{service.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDot[service.status]} shrink-0`} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{service.description}</p>
              {service.isInternalOnly && (
                <div className="inline-block px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-xs font-semibold text-amber-400">
                  INTERNAL
                </div>
              )}
            </div>
          );
        })}

        {/* Link to details page for desktop */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push("/details");
          }}
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/btn py-2 mt-2 border border-border rounded-lg hover:border-primary/20"
        >
          <span>View details</span>
          <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

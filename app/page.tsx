"use client";

import Link from "next/link";
import { useMemo, useCallback, useState } from "react";
import { useHealthStatus } from "@/hooks/use-health-status";
import EcosystemGlobe from "@/components/globe";
import { Cpu, Globe, Monitor, Smartphone, Code, Brain, ChevronDown, Book } from "lucide-react";

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

export default function Home() {
  const { lastUpdate, services: healthServices } = useHealthStatus();
  const [expanded, setExpanded] = useState(false);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const services = useMemo<ServiceInfo[]>(() => {
    const iconMap: Record<string, typeof Globe> = {
      "Production API": Code,
      "Development API": Cpu,
      "Documentation": Book,
      "Web Platform": Globe,
    };

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

  const ServiceCard = ({ service }: { service: ServiceInfo }) => {
    const Icon = service.icon;
    return (
      <div
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
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-zinc-900">
        <div className="flex items-center gap-2">
          <Link
            href="/details"
            className="px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-foreground/20 rounded hover:bg-primary/30 transition-colors"
          >
            Details
          </Link>
        </div>
        <div className="text-xs text-zinc-500">Updated {getTimeAgo(lastUpdate)}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-full flex items-center px-8">
          {/* Left Cards */}
          <div className="hidden lg:flex flex-col gap-3 w-[200px] max-h-[600px] overflow-y-auto">
            {services.slice(0, Math.ceil(services.length / 2)).map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>

          {/* Left Spacer */}
          <div className="hidden lg:flex flex-1"></div>

          {/* Center Globe */}
          <div className="flex min-w-0 w-full max-w-3xl mx-auto">
            <EcosystemGlobe />
          </div>

          {/* Right Spacer */}
          <div className="hidden lg:flex flex-1"></div>

          {/* Right Cards */}
          <div className="hidden lg:flex flex-col gap-3 w-[200px] max-h-[600px] overflow-y-auto">
            {services.slice(Math.ceil(services.length / 2)).map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>

          {/* Mobile Services Toggle */}
          <div className="lg:hidden flex flex-col items-center w-full">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1.5 text-muted-foreground text-xs group hover:text-foreground transition-colors"
            >
              <span>{expanded ? "Collapse" : "View services"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              />
            </button>

            {expanded && (
              <div className="w-full grid gap-3 sm:grid-cols-2 mt-4 px-4">
                {services.map((service) => (
                  <ServiceCard key={service.name} service={service} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-zinc-900 text-xs text-zinc-600">
        <span> </span>
        <span>Powered by TurnOne</span>
      </div>
    </div>
  );
}

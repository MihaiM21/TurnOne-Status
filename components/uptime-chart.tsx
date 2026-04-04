"use client";

import { useMemo } from "react";

interface UptimeData {
  name: string;
  days: number[];
}

const generateUptimeData = (): UptimeData[] => {
  const services = [
    "Production API",
    "Development API",
    "Web Platform",
    "Mobile App",
    "Desktop App",
  ];

  return services.map((name) => ({
    name,
    days: Array.from({ length: 90 }, () => {
      const rand = Math.random();
      // 95% chance of operational (green), 4% degraded (yellow), 1% down (red)
      if (rand < 0.95) return 2; // operational
      if (rand < 0.99) return 1; // degraded
      return 0; // down
    }),
  }));
};

const getBarColor = (value: number) => {
  switch (value) {
    case 2:
      return "bg-green-500";
    case 1:
      return "bg-yellow-500";
    case 0:
      return "bg-red-500";
    default:
      return "bg-zinc-800";
  }
};

export default function UptimeChart() {
  const data = useMemo(() => generateUptimeData(), []);
  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      {data.map((service) => (
        <div key={service.name}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">{service.name}</h3>
            <span className="text-xs text-zinc-500">90 days</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 flex gap-0.5 flex-wrap">
              {service.days.map((value, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-sm ${getBarColor(value)}`}
                  title={`Day ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
            <span>{ninetyDaysAgo.toLocaleDateString()}</span>
            <span>{today.toLocaleDateString()}</span>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-6 justify-center mt-8 pt-6 border-t border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-green-500"></div>
          <span className="text-xs text-zinc-500">Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-yellow-500"></div>
          <span className="text-xs text-zinc-500">Degraded</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-red-500"></div>
          <span className="text-xs text-zinc-500">Down</span>
        </div>
      </div>
    </div>
  );
}

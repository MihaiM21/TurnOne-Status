export interface HealthCheck {
  status: "healthy" | "degraded" | "down";
  version: string;
  environment: string;
  checks: {
    api: string;
    session_tracker: string;
    background_processor: string;
    processed_sessions: number;
    environment: string;
  };
}

export interface ServiceHealth {
  name: string;
  endpoint: string;
  status: "operational" | "degraded" | "down";
  uptime: number;
  response: string;
  lastChecked: string;
  version?: string;
  environment?: string;
  checks?: Record<string, unknown>;
}

const API_ENDPOINTS = {
  production: "https://api.t1f1.com/api/health",
  development: "https://apidev.t1f1.com/api/health",
};

export async function fetchHealthCheck(endpoint: string): Promise<{
  health: HealthCheck | null;
  responseTime: number;
  error: string | null;
}> {
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        health: null,
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }

    const data: HealthCheck = await response.json();
    return {
      health: data,
      responseTime,
      error: null,
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      health: null,
      responseTime,
      error: errorMessage,
    };
  }
}

export async function fetchAllHealthChecks(): Promise<ServiceHealth[]> {
  const [prodHealth, devHealth] = await Promise.all([
    fetchHealthCheck(API_ENDPOINTS.production),
    fetchHealthCheck(API_ENDPOINTS.development),
  ]);

  const services: ServiceHealth[] = [];

  // Production API
  services.push({
    name: "Production API",
    endpoint: API_ENDPOINTS.production,
    status:
      prodHealth.error || !prodHealth.health
        ? "down"
        : prodHealth.health.status === "healthy"
          ? "operational"
          : "degraded",
    uptime: prodHealth.error || !prodHealth.health ? 0 : 99.98,
    response: `${prodHealth.responseTime}ms`,
    lastChecked: "just now",
    version: prodHealth.health?.version,
    environment: prodHealth.health?.environment,
    checks: prodHealth.health?.checks as Record<string, unknown>,
  });

  // Development API
  services.push({
    name: "Development API",
    endpoint: API_ENDPOINTS.development,
    status:
      devHealth.error || !devHealth.health
        ? "down"
        : devHealth.health.status === "healthy"
          ? "operational"
          : "degraded",
    uptime: devHealth.error || !devHealth.health ? 0 : 99.85,
    response: `${devHealth.responseTime}ms`,
    lastChecked: "just now",
    version: devHealth.health?.version,
    environment: devHealth.health?.environment,
    checks: devHealth.health?.checks as Record<string, unknown>,
  });

  return services;
}

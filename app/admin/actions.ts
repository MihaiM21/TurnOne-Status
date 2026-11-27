"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  cancelMaintenance,
  completeMaintenanceEarly,
  componentsFromForm,
  createIncidentAdmin,
  createMaintenanceAdmin,
  editIncident,
  postIncidentUpdate,
  resolveIncident,
  updateMaintenanceAdmin,
} from "@/lib/status/admin";
import {
  LOGIN_DELAY_MS,
  SESSION_COOKIE,
  adminConfigured,
  checkPassword,
  clearLoginAttempts,
  clientIp,
  createSessionValue,
  registerLoginAttempt,
  requireAdmin,
  safeNext,
  sessionCookieOptions,
} from "@/lib/status/auth";
import { formToValues, type FormState } from "@/components/admin/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const flag = (fd: FormData, k: string) => fd.get(k) === "on";

function refresh(id?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/incidents");
  if (id) revalidatePath(`/incidents/${id}`);
}

// ---- auth ------------------------------------------------------------------

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const sleep = () => new Promise((r) => setTimeout(r, LOGIN_DELAY_MS));
  if (!adminConfigured()) {
    await sleep();
    return { errors: { form: "Admin is not configured." } };
  }
  const ip = await clientIp();
  if (!registerLoginAttempt(ip)) {
    await sleep();
    return { errors: { form: "Too many attempts. Try again in a few minutes." } };
  }
  if (!checkPassword(str(fd, "password"))) {
    await sleep();
    return { errors: { form: "Incorrect password." } };
  }
  clearLoginAttempts(ip);
  const { value, expires } = createSessionValue();
  (await cookies()).set(SESSION_COOKIE, value, sessionCookieOptions(expires));
  redirect(safeNext(str(fd, "next")));
}

export async function logoutAction(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  redirect("/admin/login");
}

// ---- incidents -------------------------------------------------------------

export async function createIncidentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const res = await createIncidentAdmin({
    title: fd.get("title"),
    impact: fd.get("impact"),
    state: fd.get("state"),
    body: fd.get("body"),
    components: componentsFromForm(fd),
    discord: flag(fd, "discord"),
  });
  if (!res.ok) return { errors: res.errors, values: formToValues(fd) };
  refresh(res.data.id);
  redirect(`/admin/incidents/${res.data.id}`);
}

export async function postUpdateAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const res = await postIncidentUpdate(id, {
    state: fd.get("state"),
    body: fd.get("body"),
    components: componentsFromForm(fd),
    discord: flag(fd, "discord"),
  });
  if (!res.ok) return { errors: res.errors, values: formToValues(fd) };
  refresh(id);
  redirect(`/admin/incidents/${id}`);
}

export async function resolveIncidentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const res = await resolveIncident(id, fd.get("body"), flag(fd, "discord"));
  if (!res.ok) return { errors: res.errors, values: formToValues(fd) };
  refresh(id);
  redirect(`/admin/incidents/${id}`);
}

/** Dashboard quick action: resolve with the default message, no Discord post. */
export async function quickResolveAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await resolveIncident(id, undefined, flag(fd, "discord"));
  refresh(id);
  redirect("/admin");
}

export async function editIncidentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const res = editIncident(id, { title: fd.get("title"), impact: fd.get("impact") });
  if (!res.ok) return { errors: res.errors, values: formToValues(fd) };
  refresh(id);
  redirect(`/admin/incidents/${id}`);
}

// ---- maintenance -----------------------------------------------------------

function maintenanceRaw(fd: FormData) {
  return {
    title: fd.get("title"),
    body: fd.get("body"),
    componentIds: fd.getAll("comp").filter((v): v is string => typeof v === "string"),
    start: fd.get("start"),
    end: fd.get("end"),
    discord: flag(fd, "discord"),
  };
}

export async function createMaintenanceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const res = await createMaintenanceAdmin(maintenanceRaw(fd));
  if (!res.ok) return { errors: res.errors, values: formToValues(fd) };
  refresh();
  redirect(`/admin/maintenance/${res.data.id}`);
}

export async function updateMaintenanceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const res = updateMaintenanceAdmin(id, maintenanceRaw(fd));
  if (!res.ok) return { errors: res.errors, values: formToValues(fd) };
  refresh();
  redirect(`/admin/maintenance/${id}`);
}

export async function completeMaintenanceAction(fd: FormData): Promise<void> {
  await requireAdmin();
  completeMaintenanceEarly(str(fd, "id"));
  refresh();
  redirect("/admin");
}

export async function cancelMaintenanceAction(fd: FormData): Promise<void> {
  await requireAdmin();
  cancelMaintenance(str(fd, "id"));
  refresh();
  redirect("/admin");
}

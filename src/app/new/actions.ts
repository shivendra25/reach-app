"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/server";
import { createProject } from "@/lib/projects/repo";
import { parseProjectInput } from "@/lib/projects/validation";

export type ProjectActionState = {
  ok: false;
  errors: Record<string, string>;
} | null;

export async function createProjectAction(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = parseProjectInput(formData);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }

  const project = await createProject(user.id, parsed.data);

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}
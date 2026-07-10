"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { getProject, updateProjectNicheFit } from "@/lib/projects/repo";
import { evaluateNicheFit, type QualifyingAnswers } from "@/lib/projects/niche-gate";

export async function evaluateNicheFitAction(
  projectId: string,
  formData: FormData
) {
  const user = await getUser();
  if (!user) redirect("/login");

  const project = await getProject(projectId, user.id);
  if (!project) redirect("/dashboard");

  const answers: QualifyingAnswers = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") answers[key] = value;
  }

  const result = evaluateNicheFit(project, answers);
  await updateProjectNicheFit(projectId, user.id, result.fit, result.reason);
}
import { z } from "zod";

export const projectInputSchema = z.object({
  name: z.string().min(1, "App name is required").max(100, "Keep it under 100 characters"),
  app_url: z.string().url("Enter a valid URL").or(z.literal("")),
  repo_url: z.string().url("Enter a valid URL").or(z.literal("")),
  problem: z.string().min(10, "Describe the problem in at least 10 characters").max(1000),
  who_suffers: z.string().min(10, "Describe who suffers in at least 10 characters").max(1000),
  what_they_pay: z.string().min(5, "What would they pay? Be specific.").max(1000),
});

export type ParsedProjectInput = z.infer<typeof projectInputSchema>;

export function parseProjectInput(formData: FormData): {
  ok: true;
  data: ParsedProjectInput;
} | {
  ok: false;
  errors: Record<string, string>;
} {
  const raw = {
    name: String(formData.get("name") ?? ""),
    app_url: String(formData.get("app_url") ?? ""),
    repo_url: String(formData.get("repo_url") ?? ""),
    problem: String(formData.get("problem") ?? ""),
    who_suffers: String(formData.get("who_suffers") ?? ""),
    what_they_pay: String(formData.get("what_they_pay") ?? ""),
  };

  const result = projectInputSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "_");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  return { ok: true, data: result.data };
}
"use client";

import { useTransition } from "react";
import { QUALIFYING_QUESTIONS } from "@/lib/projects/niche-gate";
import { evaluateNicheFitAction } from "@/app/projects/[id]/actions";

export default function NicheGateForm({
  projectId,
}: {
  projectId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await evaluateNicheFitAction(projectId, formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {QUALIFYING_QUESTIONS.map((q) => (
        <fieldset key={q.key} className="flex flex-col gap-2">
          <legend className="text-sm font-medium mb-2">{q.label}</legend>
          {q.options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="radio"
                name={q.key}
                value={opt.value}
                required
                className="accent-foreground"
              />
              <span className="text-sm text-foreground/80">{opt.label}</span>
            </label>
          ))}
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? "Evaluating…" : "Check my fit"}
      </button>
    </form>
  );
}
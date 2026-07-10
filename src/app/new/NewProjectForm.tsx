"use client";

import { useActionState } from "react";
import { createProjectAction } from "@/app/new/actions";

export default function NewProjectForm() {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    null
  );

  const errors = state && "errors" in state ? state.errors : {};
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-5 w-full max-w-lg">
      <Field
        label="App name"
        name="name"
        placeholder="e.g. Linear for indie devs"
        error={errors.name}
        required
      />
      <Field
        label="App URL"
        name="app_url"
        placeholder="https://myapp.com"
        error={errors.app_url}
      />
      <Field
        label="Repo URL"
        name="repo_url"
        placeholder="https://github.com/you/myapp"
        error={errors.repo_url}
      />
      <TextArea
        label="What problem does it solve?"
        name="problem"
        placeholder="Describe the core problem your app addresses."
        error={errors.problem}
        required
      />
      <TextArea
        label="Who suffers from this problem most?"
        name="who_suffers"
        placeholder="Be specific: 'indie devs using Notion who lose track of bugs.'"
        error={errors.who_suffers}
        required
      />
      <TextArea
        label="What are they paying for today?"
        name="what_they_pay"
        placeholder="What alternatives, workarounds, or tools do they currently pay for?"
        error={errors.what_they_pay}
        required
      />

      {hasErrors && (
        <p className="text-sm text-red-600">
          Please fix the highlighted fields and try again.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? "Analyzing…" : "Find my audience"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  error,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground/80">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        className="rounded-lg border border-foreground/15 px-3 py-2 text-foreground outline-none focus:border-foreground/40 transition"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
  error,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground/80">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={3}
        className="rounded-lg border border-foreground/15 px-3 py-2 text-foreground outline-none focus:border-foreground/40 transition resize-none"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
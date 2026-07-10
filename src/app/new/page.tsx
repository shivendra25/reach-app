import NewProjectForm from "@/app/new/NewProjectForm";

export default function NewProjectPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Analyze your app</h1>
        <p className="text-foreground/60 max-w-md">
          Tell us what you built and who it&apos;s for. We&apos;ll find where they
          already hang out and what they&apos;ll pay.
        </p>
      </div>
      <NewProjectForm />
    </main>
  );
}
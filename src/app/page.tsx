export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">24front</h1>
      <p className="text-muted">Frontend scaffold is up. Pages land in the next phases.</p>
      <div className="flex gap-3">
        <span className="bg-accent rounded-full px-4 py-2 text-sm font-medium text-white">
          accent
        </span>
        <span className="bg-surface rounded-full px-4 py-2 text-sm font-medium">surface</span>
        <span className="border-border rounded-full border px-4 py-2 text-sm font-medium">
          border
        </span>
      </div>
    </main>
  );
}

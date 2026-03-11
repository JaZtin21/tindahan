export function MapPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Map</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Next: Google Maps + item search + nearest stores.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Search item</label>
          <input
            placeholder="e.g. eggs, noodles, softdrinks"
            className="mt-2 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-emerald-500"
          />
          <button
            className="mt-3 w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white"
            type="button"
          >
            Search (placeholder)
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-4">
          <div className="flex h-[520px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            Google Map placeholder
          </div>
        </div>
      </div>
    </div>
  )
}


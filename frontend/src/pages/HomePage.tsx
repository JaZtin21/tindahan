import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h1 className="text-balance text-3xl font-semibold tracking-tight">
          Find the nearest sari-sari store with what you need.
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Search items near you, view store profiles, and request items. For owners, manage inventory
          based on real demand.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/map"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Open map
          </Link>
          <Link
            to="/owner"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
          >
            Owner portal (MVP)
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 p-5">
          <div className="text-sm font-semibold">Customer</div>
          <div className="mt-2 text-sm text-zinc-300">
            Search “pancit canton” and see nearby stores with stock.
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 p-5">
          <div className="text-sm font-semibold">Owner</div>
          <div className="mt-2 text-sm text-zinc-300">
            Update inventory fast and respond to item requests.
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 p-5">
          <div className="text-sm font-semibold">Trust</div>
          <div className="mt-2 text-sm text-zinc-300">
            Customers see “last updated” and reviews for confidence.
          </div>
        </div>
      </section>
    </div>
  )
}


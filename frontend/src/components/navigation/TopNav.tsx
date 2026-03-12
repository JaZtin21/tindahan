import { Link } from 'react-router-dom'
import { ThemeToggle } from '../../theme'

export function TopNav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 fixed top-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-semibold tracking-tight">
          Tindahan
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          <ThemeToggle />
          <Link to="/map" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Map
          </Link>
          <Link to="/owner" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Owner
          </Link>
        </nav>
      </div>
    </header>
  )
}

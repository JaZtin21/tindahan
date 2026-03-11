import { Outlet } from 'react-router-dom'
import { TopNav } from './components/navigation'

export function App() {
  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
      <TopNav />
      
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}


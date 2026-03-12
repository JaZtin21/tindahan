import { Outlet } from 'react-router-dom'
import { TopNav } from './components/navigation'

export function App() {
  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
      {/* Fixed TopNav */}

      
      {/* Main content with top padding for fixed nav */}
      <main className="relative">
        <TopNav />
        <Outlet />
      </main>
    </div>
  )
}

// Add default export for compatibility
export default App;


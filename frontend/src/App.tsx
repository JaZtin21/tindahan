import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { TopNav, SideNav } from './components/navigation'
import { closeSideNav } from './store'
import type { RootState } from './store'

export function App() {
  const dispatch = useDispatch()
  const { isOpen, selectedLocation } = useSelector((state: RootState) => state.sideNav)

  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-900">
      {/* Main content with top padding for fixed nav */}
      <main className="relative">
        <TopNav />
        <SideNav 
          isOpen={isOpen} 
          onClose={() => dispatch(closeSideNav())}
          selectedLocation={selectedLocation}
        />
        <Outlet />
      </main>
    </div>
  )
}

// Add default export for compatibility
export default App;


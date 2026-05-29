import { useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { TopNav, SideNav } from './components/navigation'
import { closeSideNav } from './store'
import './style.css'
import type { RootState } from './store'

export function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { isOpen, selectedLocation } = useSelector((state: RootState) => state.sideNav)

  // Memoize onClose to prevent unnecessary SideNav re-renders
  const handleCloseSideNav = useCallback(() => {
    dispatch(closeSideNav())
  }, [dispatch])

  // Close side nav when route changes (when clicking top nav buttons)
  useEffect(() => {
    console.log(isOpen)
    if (isOpen && location.pathname !== '/map') {
      handleCloseSideNav()
    }
  }, [location.pathname, isOpen, handleCloseSideNav])

  // Hide topnav on home page for onboarding carousel
  const isHomePage = location.pathname === '/'

  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-900">
      {/* Main content with top padding for fixed nav */}
      <main className="relative">
        {!isHomePage && <TopNav />}
        <SideNav 
          isOpen={isOpen} 
          onClose={handleCloseSideNav}
          selectedLocation={selectedLocation}
        />
        <Outlet />
      </main>
    </div>
  )
}

// Add default export for compatibility
export default App;


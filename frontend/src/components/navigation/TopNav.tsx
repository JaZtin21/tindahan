import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { ThemeToggle } from '../../theme'
import { useAuth } from '../../api/graphql/apolloProviderWithAuth'
import { FiSearch } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import { toggleMobileSearch } from '../../store/slices/mobileSearchSlice'
import { toggleTheme } from '../../store'
import type { RootState } from '../../store'


export function TopNav() {
  const { isAuthenticated, userInfo, logoutAndClear } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isMobileSearchVisible = useSelector((state: RootState) => (state.mobileSearch as any).isSearchVisible)
  const isDarkMode = useSelector((state: RootState) => state.theme === 'dark')
  const isMapPage = location.pathname === '/map'

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsDropdownOpen(false)
    await logoutAndClear()
  }

  const handleSearchToggle = () => {
    dispatch(toggleMobileSearch())
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!userInfo) return '?'
    const name = userInfo.name || userInfo.firstName || userInfo.email
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Check if photo is a Google profile image that has CORS restrictions
  const isGoogleProfileImage = (url: string): boolean => {
    return url?.includes('googleusercontent.com') || url?.includes('google.com') || false
  }

  // Get safe profile photo URL - Google images need special handling
  const getSafeProfilePhoto = (): string | null => {
    if (!userInfo?.profilePhoto) return null
    const photo = userInfo.profilePhoto

    // Google profile images have strict CORS - use as-is but with special img attributes
    // or use a proxy if available
    if (isGoogleProfileImage(photo)) {
      // For now, return the URL but we'll add crossOrigin attribute to img
      // Consider using a backend proxy for Google images in production
      return photo
    }

    return photo
  }

  // State for image error handling - must be at top level
  const [imgError, setImgError] = useState(false)
  const safePhoto = getSafeProfilePhoto()

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-[5px] dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/map" className="font-semibold tracking-tight flex flex-row gap-2 items-center text-zinc-600 dark:text-zinc-300">
          <img src='/icon-180.svg' className='h-8 w-8 ' />
          Tindahan
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          {/* Search button - only on mobile and only on maps page */}
          {isMobile && isMapPage && (
            <button
              onClick={handleSearchToggle}
              className={`p-1 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors ${isMobileSearchVisible ? 'text-primary' : ''}`}
              title="Search"
            >
              <FiSearch size={20} />
            </button>
          )}

          {/* ThemeToggle, Map, Owner - hide on mobile */}
          {!isMobile && <ThemeToggle />}
          {!isMobile && (
            <Link to="/map" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Home
            </Link>
          )}
          {!isMobile && isAuthenticated && (
            <Link to="/owner" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Shops
            </Link>
          )}

          {isAuthenticated && userInfo ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 focus:outline-none"
              >
                {safePhoto && !imgError ? (
                  <img
                    src={safePhoto}
                    alt="Profile"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium hover:bg-primary-700 transition-colors">
                    {getUserInitials()}
                  </div>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {userInfo.name || userInfo.email}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {userInfo.email}
                    </p>
                  </div>

                  {/* Mobile-only: Reordered dropdown items */}
                  {isMobile && (
                    <>
                      <button
                        onClick={() => {
                          if (location.pathname !== '/profile') {
                            setIsDropdownOpen(false)
                            navigate('/profile')
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          if (location.pathname !== '/map') {
                            setIsDropdownOpen(false)
                            navigate('/map')
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Home
                      </button>
                      {isAuthenticated && (
                        <button
                          onClick={() => {
                            if (location.pathname !== '/owner') {
                              setIsDropdownOpen(false)
                              navigate('/owner')
                            }
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Shops
                        </button>
                      )}
                      <button
                        onClick={() => {
                          dispatch(toggleTheme())
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  )}

                  {/* Desktop-only dropdown items */}
                  {!isMobile && (
                    <>
                      <button
                        onClick={() => {
                          if (location.pathname !== '/profile') {
                            setIsDropdownOpen(false)
                            navigate('/profile')
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        View Profile
                      </button>
                      {userInfo.role === 'OWNER' && (
                        <button
                          onClick={() => {
                            if (location.pathname !== '/owner') {
                              setIsDropdownOpen(false)
                              navigate('/owner')
                            }
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          My Store
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

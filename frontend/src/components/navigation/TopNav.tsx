import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { ThemeToggle } from '../../theme'
import { useAuth } from '../../api/graphql/apolloProviderWithAuth'

export function TopNav() {
  const { isAuthenticated, userInfo, logoutAndClear } = useAuth()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleViewProfile = () => {
    setIsDropdownOpen(false)
    navigate('/profile')
  }

  const handleMyStore = () => {
    setIsDropdownOpen(false)
    navigate('/owner')
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
          {isAuthenticated && (
            <Link to="/owner" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Owner
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
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium hover:bg-blue-700 transition-colors">
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
                  <button
                    onClick={handleViewProfile}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    View Profile
                  </button>
                  {userInfo.role === 'OWNER' && (
                    <button
                      onClick={handleMyStore}
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
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

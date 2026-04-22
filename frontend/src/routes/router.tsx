import { Navigate, createBrowserRouter } from 'react-router-dom'

import App from '../App'
import { HomePage } from '../pages/HomePage'
import { MapPage } from '../pages/MapPage'
import { OwnerPage } from '../pages/OwnerPage'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { ProfilePage } from '../pages/profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'owner', element: <OwnerPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/:userId', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])


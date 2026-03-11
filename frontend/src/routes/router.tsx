import { Navigate, createBrowserRouter } from 'react-router-dom'

import { App } from '../App'
import { HomePage } from '../pages/HomePage'
import { MapPage } from '../pages/MapPage'
import { OwnerPage } from '../pages/OwnerPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'owner', element: <OwnerPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])


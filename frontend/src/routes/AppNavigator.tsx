import { RouterProvider } from 'react-router-dom'

import { router } from './router'

export function AppNavigator() {
  return <RouterProvider router={router} />
}


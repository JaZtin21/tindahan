import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'

import './style.css'
import ApolloProviderWithAuth from './api/graphql/apolloProviderWithAuth'
import { store } from './store'
import { ThemeProvider } from './theme'
import { AppNavigator } from './routes/AppNavigator'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <ThemeProvider>
          <ApolloProviderWithAuth>
            <AppNavigator />
          </ApolloProviderWithAuth>
        </ThemeProvider>
      </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'

import './style.css'
import ApolloProviderWithAuth from './api/graphql/apolloProviderWithAuth'
import { store } from './store'
import { ThemeProvider } from './theme'
import { AppNavigator } from './routes/AppNavigator'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ApolloProviderWithAuth>
          <AppNavigator />
        </ApolloProviderWithAuth>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
)


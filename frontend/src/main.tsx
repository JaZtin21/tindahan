import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { Provider } from 'react-redux'

import './style.css'
import { apolloClient } from './app/apollo'
import { store } from './store'
import { ThemeProvider } from './theme'
import { AppNavigator } from './routes/AppNavigator'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ApolloProvider client={apolloClient}>
          <AppNavigator />
        </ApolloProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
)


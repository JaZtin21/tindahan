import { InMemoryCache } from '@apollo/client/cache'
import { ApolloClient } from '@apollo/client/core'
import { HttpLink } from '@apollo/client/link/http'

import { env } from '../../utils/env'

export const graphqlUri = env('VITE_GRAPHQL_URI') || '/api/graphql'

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUri }),
  cache: new InMemoryCache(),
})


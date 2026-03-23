import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// GraphQL endpoint - matches our backend
const GRAPHQL_ENDPOINT = process.env.VITE_GRAPHQL_URL || 'http://localhost:8080/query';

// HTTP link for GraphQL
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Auth link for adding JWT token
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage
  const token = localStorage.getItem('access_token');

  // Return the headers with the authorization token
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  // Combine auth and http links
  link: from([authLink, httpLink]),
  
  // Configure cache
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache individual items by ID
          item: {
            merge: true,
          },
          // Cache individual shops by ID
          shop: {
            merge: true,
          },
          // Cache lists with pagination
          shops: {
            merge: false,
          },
          items: {
            merge: false,
          },
          myShops: {
            merge: false,
          },
          myItems: {
            merge: false,
          },
        },
      },
      // Cache policies for specific types
      Shop: {
        keyFields: ['id'],
        fields: {
          // Always merge inventory arrays
          inventory: {
            merge: false,
          },
        },
      },
      Item: {
        keyFields: ['id'],
      },
      User: {
        keyFields: ['id'],
      },
    },
  }),

  // Default options for all queries and mutations
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Export configured client
export default apolloClient;

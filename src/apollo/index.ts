// Example from Next.js Github. https://github.com/vercel/next.js/blob/canary/examples/with-apollo/lib/apolloClient.js
// Explanation is not removed.

import { ApolloClient, InMemoryCache } from '@apollo/client';
import { useMemo } from 'react';

let apolloClient: ApolloClient<any>;

const createApolloClient = () => {
  return new ApolloClient({
    uri: 'http://localhost:4000/graphql',
    cache: new InMemoryCache(),

    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-first',
      },
    },
    ssrMode: false,
  });
};

//
export function initializeApollo(initialState: any = null) {
  apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = apolloClient.extract();
    // Restore the cache using the data passed from getStaticProps/getServerSideProps
    // combined with the existing cached data
    apolloClient.cache.restore({ ...existingCache, ...initialState });
  }
  // For SSG and SSR always create a new Apollo Client
  // if (typeof window === 'undefined') return apolloClient;
  // Create the Apollo Client once in the client
  // if (!apolloClient) apolloClient = apolloClient;

  return apolloClient;
}

export function useApollo(initialState?: any) {
  const store = useMemo(() => initializeApollo(initialState), [initialState]);
  return store;
}

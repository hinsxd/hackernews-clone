import { ApolloProvider } from '@apollo/client';
import dynamic from 'next/dynamic';
import { CssBaseline, ThemeProvider } from '@material-ui/core';
import { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useApollo } from 'src/apollo';
import { theme } from 'src/theme';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);
  const apolloClient = useApollo();
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </ApolloProvider>
  );
}

// Just to prevent "Did not expect server HTML to contain" in development due to SSR.
// Deployment will be Static page anyways, therefore no error will occur.
export default dynamic(() => Promise.resolve(MyApp), { ssr: false });

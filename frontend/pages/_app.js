import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (process.env.DEBUG === 'true') {
      window.debugNextRouter = true;
      console.log('Debug mode enabled');
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
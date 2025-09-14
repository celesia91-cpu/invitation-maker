import { AppStateProvider } from '../context/AppStateContext.jsx';
import '../styles/globals.css';
import '../styles/styles.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <AppStateProvider>
      <Component {...pageProps} />
    </AppStateProvider>
  );
}

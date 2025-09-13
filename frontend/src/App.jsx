import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { createContext, useContext, useMemo } from 'react';
import './App.css';

// Context to expose query-string parameters across the app
const QueryParamsContext = createContext(new URLSearchParams());

export function useQueryParams() {
  return useContext(QueryParamsContext);
}

function QueryParamsProvider({ children }) {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  return (
    <QueryParamsContext.Provider value={params}>
      {children}
    </QueryParamsContext.Provider>
  );
}

// Placeholder components for the two main routes
function Marketplace() {
  return <div>Marketplace</div>;
}

function Editor() {
  const { token: tokenParam } = useParams();
  const query = useQueryParams();
  // Token can come from either the route param or query string
  const token = tokenParam || query.get('token');
  const view = query.get('view');
  return (
    <div>
      Editor
      {token && <span> Token: {token}</span>}
      {view && <span> View: {view}</span>}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <QueryParamsProvider>
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/editor/:token?" element={<Editor />} />
        </Routes>
      </QueryParamsProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { createContext, useContext, useMemo, useState } from 'react';
import AuthModal from './components/AuthModal.jsx';
import SlidesPanel from './components/SlidesPanel.jsx';
import TextLayer from './components/TextLayer.jsx';
import DragHandler from './components/DragHandler.jsx';
import CollapsibleGroup from './components/CollapsibleGroup.jsx';
import { AppStateProvider, useAppState } from './context/AppStateContext.jsx';
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
  const token = tokenParam || query.get('token');
  const view = query.get('view');
  const { selectedSlide, tokenBalance } = useAppState();
  const [showAuth, setShowAuth] = useState(false);

  const slides = [
    { id: 1, text: 'First Slide' },
    { id: 2, text: 'Second Slide' },
  ];

  return (
    <div>
      Editor
      {token && <span> Token: {token}</span>}
      {view && <span> View: {view}</span>}
      <div>Token Balance: {tokenBalance}</div>
      <button onClick={() => setShowAuth(true)}>Login</button>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <CollapsibleGroup title="Slides">
        <SlidesPanel slides={slides} />
      </CollapsibleGroup>
      <TextLayer initialText={slides[selectedSlide]?.text} />
      <DragHandler />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppStateProvider>
        <QueryParamsProvider>
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/editor/:token?" element={<Editor />} />
          </Routes>
        </QueryParamsProvider>
      </AppStateProvider>
    </BrowserRouter>
  );
}

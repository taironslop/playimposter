import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './index.css';

const LobbyWrapper = () => {
  const location = useLocation();
  const { roomCode, playerId, playerName } = location.state || {};
  
  if (!roomCode || !playerId) {
    return <Home />;
  }
  
  return <Lobby roomCode={roomCode} playerId={playerId} playerName={playerName} />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<LobbyWrapper />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToRoom, getRoom, getPlayers, startGame, kickPlayer, getCategories } from '../services/supabaseService';

const Lobby = ({ roomCode, playerId, playerName }) => {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const categories = getCategories();
  const navigate = useNavigate();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Error copying code:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const link = `${window.location.origin}/?join=${roomCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const loadInitialData = async () => {
      try {
        const roomData = await getRoom(roomCode);
        const playersData = await getPlayers(roomCode);
        setRoom(roomData);
        setPlayers(playersData);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar la sala');
        setLoading(false);
      }
    };

    loadInitialData();

    const unsubscribe = subscribeToRoom(
      roomCode,
      (newRoom) => {
        setRoom(newRoom);
      },
      (newPlayers) => {
        console.log('Players updated:', newPlayers);
        setPlayers(newPlayers);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [roomCode]);

  useEffect(() => {
    if (room?.status === 'PLAYING') {
      navigate('/game', { state: { roomCode, playerId, playerName } });
    }
  }, [room?.status, navigate, roomCode, playerId, playerName]);

  const handleStartGame = async () => {
    setStarting(true);
    setError(null);
    try {
      await startGame(roomCode, selectedCategory || null);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  const handleRemovePlayer = async (playerIdToRemove) => {
    try {
      await kickPlayer(playerIdToRemove);
    } catch (err) {
      setError('Error al eliminar jugador');
    }
  };

  const activePlayers = players.filter(p => !p.is_spectator);
  const spectators = players.filter(p => p.is_spectator);
  const isHost = activePlayers.length > 0 && activePlayers[0]?.id === playerId;
  const isSpectator = spectators.some(p => p.id === playerId);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Sala de Espera</h1>
          
          {/* Room Code with Copy */}
          <div className="bg-dark-surface rounded-lg px-6 py-4 inline-block mb-4">
            <span className="text-text-secondary text-sm block mb-1">Código de sala:</span>
            <div className="flex items-center justify-center space-x-3">
              <span className="text-neon-violet text-3xl font-mono font-bold">{roomCode}</span>
              <button
                onClick={handleCopyCode}
                className={`p-2 rounded-lg transition-all ${
                  copiedCode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Copiar código"
              >
                {copiedCode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Copy Link Button */}
          <div>
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                copiedLink 
                  ? 'bg-green-600 text-white' 
                  : 'bg-neon-violet/20 hover:bg-neon-violet/30 text-neon-violet border border-neon-violet'
              }`}
            >
              {copiedLink ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>¡Link copiado!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Copiar link de invitación</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Spectator Notice */}
        {isSpectator && (
          <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg mb-6 text-center">
            <span className="font-semibold">👁️ Eres espectador</span>
            <p className="text-sm mt-1">Puedes ver la partida pero no participar</p>
          </div>
        )}

        <div className="game-card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Jugadores ({activePlayers.length}/10)
          </h2>
          
          <div className="space-y-2">
            {activePlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === playerId ? 'bg-neon-violet/20 border border-neon-violet' : 'bg-dark-bg'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}>
                    {index === 0 ? '👑' : (index + 1)}
                  </div>
                  <span className="text-white font-medium">{player.name}</span>
                  {player.id === playerId && (
                    <span className="text-neon-lime text-xs">(Tú)</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {index === 0 && (
                    <span className="text-yellow-500 text-xs font-medium">HOST</span>
                  )}
                  {isHost && player.id !== playerId && index !== 0 && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all hover:scale-110"
                      title="Expulsar jugador"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activePlayers.length < 3 && (
            <p className="text-text-secondary text-sm mt-4 text-center">
              Se necesitan al menos 3 jugadores para comenzar
            </p>
          )}
        </div>

        {/* Spectators Section */}
        {spectators.length > 0 && (
          <div className="game-card mb-6 opacity-70">
            <h3 className="text-lg font-semibold text-text-secondary mb-3">
              👁️ Espectadores ({spectators.length})
            </h3>
            <div className="space-y-2">
              {spectators.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-lg bg-dark-bg/50 ${
                    player.id === playerId ? 'border border-yellow-500/50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                      👁️
                    </div>
                    <span className="text-text-secondary font-medium">{player.name}</span>
                    {player.id === playerId && (
                      <span className="text-yellow-500 text-xs">(Tú)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Selector - Host Only */}
        {isHost && (
          <div className="game-card mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">🎯 Configuración de Partida</h3>
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-violet appearance-none cursor-pointer"
              >
                <option value="">🎲 Aleatoria</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <p className="text-text-secondary text-xs mt-2">
                {selectedCategory 
                  ? `Se elegirá una palabra de la categoría "${selectedCategory}"`
                  : 'Se elegirá una categoría y palabra al azar'
                }
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={players.length < 3 || starting}
            className={`w-full neon-button ${
              players.length < 3 || starting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {starting ? 'Iniciando...' : 'Iniciar Partida'}
          </button>
        )}

        {!isHost && (
          <p className="text-text-secondary text-center mt-4">
            Esperando a que el host inicie la partida...
          </p>
        )}
      </div>
    </div>
  );
};

export default Lobby;

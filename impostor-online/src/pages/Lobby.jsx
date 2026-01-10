import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToRoom, getRoom, getPlayers, startGame, leaveRoom, getCategories } from '../services/supabaseService';

const Lobby = ({ roomCode, playerId, playerName }) => {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const categories = getCategories();
  const navigate = useNavigate();

  useEffect(() => {
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
        if (newRoom.status === 'PLAYING') {
          navigate('/game', { state: { roomCode, playerId, playerName } });
        }
      },
      (newPlayers) => setPlayers(newPlayers)
    );

    return () => unsubscribe();
  }, [roomCode, playerId, playerName, navigate]);

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

  const handleLeave = async () => {
    try {
      await leaveRoom(playerId);
      navigate('/');
    } catch (err) {
      setError('Error al salir de la sala');
    }
  };

  const isHost = players.length > 0 && players[0]?.id === playerId;

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
          <h1 className="text-4xl font-bold text-white mb-2">Sala de Espera</h1>
          <div className="bg-dark-surface rounded-lg px-6 py-3 inline-block">
            <span className="text-text-secondary text-sm">Código de sala:</span>
            <span className="text-neon-violet text-2xl font-mono font-bold ml-2">{roomCode}</span>
          </div>
        </div>

        <div className="game-card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Jugadores ({players.length}/10)
          </h2>
          
          <div className="space-y-2">
            {players.map((player, index) => (
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
                {index === 0 && (
                  <span className="text-yellow-500 text-xs font-medium">HOST</span>
                )}
              </div>
            ))}
          </div>

          {players.length < 3 && (
            <p className="text-text-secondary text-sm mt-4 text-center">
              Se necesitan al menos 3 jugadores para comenzar
            </p>
          )}
        </div>

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

        <div className="flex gap-4">
          <button
            onClick={handleLeave}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Salir
          </button>
          
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={players.length < 3 || starting}
              className={`flex-1 neon-button ${
                players.length < 3 || starting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {starting ? 'Iniciando...' : 'Iniciar Partida'}
            </button>
          )}
        </div>

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

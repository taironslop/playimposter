import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createRoom, joinRoom, getPlayers } from '../services/supabaseService';

const Home = () => {
  const [showModal, setShowModal] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      setShowModal('join');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Ingresa tu nombre');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { room, player } = await createRoom(playerName.trim());
      navigate('/lobby', { 
        state: { 
          roomCode: room.code, 
          playerId: player.id, 
          playerName: player.name 
        } 
      });
    } catch (err) {
      setError('Error al crear la sala. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Ingresa tu nombre');
      return;
    }
    if (!roomCode.trim()) {
      setError('Ingresa el código de sala');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if player already exists in room
      const existingPlayers = await getPlayers(roomCode.trim());
      const existingPlayer = existingPlayers.find(p => 
        p.name.toLowerCase() === playerName.trim().toLowerCase()
      );

      if (existingPlayer) {
        // Player already exists, reconnect them
        navigate('/lobby', { 
          state: { 
            roomCode: roomCode.trim(), 
            playerId: existingPlayer.id, 
            playerName: existingPlayer.name 
          } 
        });
        return;
      }

      // New player, create them
      const { room, player } = await joinRoom(roomCode.trim(), playerName.trim());
      navigate('/lobby', { 
        state: { 
          roomCode: room.code, 
          playerId: player.id, 
          playerName: player.name 
        } 
      });
    } catch (err) {
      setError(err.message || 'Error al unirse a la sala');
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(null);
    setPlayerName('');
    setRoomCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Title */}
        <div className="text-center mb-16">
          <h1 className="game-title mb-4 animate-pulse">
            IMPOSTOR ONLINE
          </h1>
          <p className="text-text-secondary text-lg font-medium">
            El juego de deducción y traición está esperando
          </p>
        </div>

        {/* Game Card */}
        <div className="game-card">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              ¿Estás listo para la misión?
            </h2>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setShowModal('create')}
                className="neon-button flex items-center justify-center space-x-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 4v16m8-8H4" />
                </svg>
                <span>Crear Sala</span>
              </button>
              
              <button 
                onClick={() => setShowModal('join')}
                className="neon-button flex items-center justify-center space-x-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Unirse a Sala</span>
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-text-secondary text-sm">
                Descubre quién no tiene la palabra secreta
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center space-x-8 text-text-secondary text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-neon-violet rounded-full animate-pulse"></div>
              <span>3-10 Jugadores</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-neon-lime rounded-full animate-pulse"></div>
              <span>1 Impostor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">
              {showModal === 'create' ? 'Crear Nueva Sala' : 'Unirse a Sala'}
            </h3>

            <form onSubmit={showModal === 'create' ? handleCreateRoom : handleJoinRoom}>
              <div className="space-y-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ingresa tu nombre"
                    className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-violet"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                {showModal === 'join' && (
                  <div>
                    <label className="block text-text-secondary text-sm mb-2">
                      Código de Sala
                    </label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Ej: ABC123"
                      className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-violet font-mono text-lg tracking-wider"
                      maxLength={6}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 neon-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Cargando...' : (showModal === 'create' ? 'Crear' : 'Unirse')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

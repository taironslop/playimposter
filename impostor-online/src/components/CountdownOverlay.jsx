import React, { useState, useEffect, useRef } from 'react';

const CountdownOverlay = ({ onComplete }) => {
  const [count, setCount] = useState(3);
  const [phase, setPhase] = useState('counting');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (phase === 'counting' && count > 0) {
      const timer = setTimeout(() => {
        setCount(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    if (phase === 'counting' && count === 0) {
      setPhase('processing');
    }
  }, [count, phase]);

  useEffect(() => {
    if (phase === 'processing') {
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center">
        {phase === 'counting' && count > 0 && (
          <>
            <div className="text-8xl font-black text-white mb-4 animate-pulse">
              {count}
            </div>
            <p className="text-2xl text-yellow-400 font-semibold">
              Contando votos...
            </p>
          </>
        )}
        
        {(phase === 'processing' || (phase === 'counting' && count === 0)) && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-neon-violet border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-2xl text-neon-violet font-semibold">
              Revelando resultado...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountdownOverlay;

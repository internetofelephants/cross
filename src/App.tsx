import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import DaySummary from './components/DaySummary';
import GameOver from './components/GameOver';
import DebugPanel, { DEBUG_MODE } from './components/DebugPanel';

type ScreenState = 'menu' | 'playing' | 'summary' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [day, setDay] = useState<number>(1);
  // Bumped to force a fresh GameCanvas, e.g. when restarting the current day from the debug panel
  const [runId, setRunId] = useState<number>(0);

  const handleStartGame = () => {
    setDay(1);
    setScreen('playing');
  };

  const handleWaveComplete = () => {
    if (day >= 10) {
      setScreen('gameover');
    } else {
      setScreen('summary');
    }
  };

  const handleNextWave = () => {
    setDay(prev => prev + 1);
    setScreen('playing');
  };

  const handleRetryLevel = () => {
    setScreen('playing');
  };

  const handleGameOver = () => {
    setScreen('gameover');
  };

  const handleDebugPlayDay = (debugDay: number) => {
    setDay(debugDay);
    setRunId(prev => prev + 1);
    setScreen('playing');
  };

  const handleRestartToMenu = () => {
    setScreen('menu');
  };

  const handleResetGame = () => {
    setDay(1);
    setScreen('menu');
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] font-sans text-[#e5e5e5] flex flex-col justify-between overflow-x-hidden overflow-y-auto relative">
      <div className="flex-1 w-full h-full min-h-screen">
        {screen === 'menu' && (
          <MainMenu onStartGame={handleStartGame} />
        )}

        {screen === 'playing' && (
          <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#0a0a0a] p-2 md:p-6 pb-2">
            <GameCanvas
              key={runId}
              day={day}
              onWaveComplete={handleWaveComplete}
              onGameOver={handleGameOver}
              onResetGame={handleResetGame}
            />
          </div>
        )}

        {screen === 'summary' && (
          <DaySummary
            nextDay={day + 1}
            onNextWave={handleNextWave}
            onResetGame={handleResetGame}
          />
        )}

        {screen === 'gameover' && (
          <GameOver
            dayReached={day}
            isVictory={day >= 10}
            onRetryLevel={handleRetryLevel}
            onNewMigration={handleResetGame}
          />
        )}
      </div>

      {DEBUG_MODE && (
        <DebugPanel currentDay={day} isPlaying={screen === 'playing'} onPlayDay={handleDebugPlayDay} />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { startMenuMusic, stopMenuMusic } from './utils/audio';
import MainMenu from './components/MainMenu';
import TitleScreen from './components/TitleScreen';
import GameCanvas from './components/GameCanvas';
import DaySummary from './components/DaySummary';
import { DeathCause } from './types';
import GameOver from './components/GameOver';

type ScreenState = 'menu' | 'playing' | 'summary' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [day, setDay] = useState<number>(1);
  // Concept-art title screen, shown once on load over the start screen
  const [showTitle, setShowTitle] = useState(true);
  // Set when the lead wildebeest dies; null after a win
  const [deathCause, setDeathCause] = useState<DeathCause | null>(null);

  // Calm music everywhere except during a crossing, which has its own
  useEffect(() => {
    if (screen === 'playing') stopMenuMusic();
    else startMenuMusic();
  }, [screen]);

  const handleStartGame = () => {
    setDay(1);
    setScreen('playing');
  };

  const handleWaveComplete = () => {
    setDeathCause(null);
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

  const handleGameOver = (cause: DeathCause) => {
    setDeathCause(cause);
    setScreen('gameover');
  };

  // Clicking a stone on the crossing map jumps straight to that crossing
  const handlePlayCrossing = (crossing: number) => {
    setDay(crossing);
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
    <div className="w-full h-full bg-page font-sans text-[#e5e5e5] flex flex-col justify-between overflow-x-hidden overflow-y-auto relative">
      <div className="flex-1 w-full h-full min-h-screen">
        {screen === 'menu' && (
          <MainMenu onStartGame={handleStartGame} onPlayCrossing={handlePlayCrossing} />
        )}

        {showTitle && <TitleScreen onDone={() => setShowTitle(false)} />}

        {screen === 'playing' && (
          <div className="w-full h-full min-h-screen flex items-center justify-center screen-glow p-2 md:p-6 pb-2">
            <GameCanvas
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
            onPlayCrossing={handlePlayCrossing}
          />
        )}

        {screen === 'gameover' && (
          <GameOver
            dayReached={day}
            isVictory={day >= 10 && deathCause === null}
            deathCause={deathCause}
            onRetryLevel={handleRetryLevel}
            onNewMigration={handleResetGame}
          />
        )}
      </div>
    </div>
  );
}

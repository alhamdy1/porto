'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';

// Game constants
const BOARD_SIZE = 10;
const CELL_SIZE = 1;
const BOARD_DIMENSION = BOARD_SIZE * CELL_SIZE;

// Snakes and Ladders positions (start -> end)
const SNAKES: Record<number, number> = {
  99: 54,
  70: 55,
  52: 42,
  25: 2,
  95: 72,
};

const LADDERS: Record<number, number> = {
  6: 25,
  11: 40,
  60: 85,
  46: 90,
  17: 69,
};

// Generate board colors
const getBoardColor = (position: number): string => {
  const row = Math.floor((position - 1) / BOARD_SIZE);
  const col = (position - 1) % BOARD_SIZE;
  const isEvenRow = row % 2 === 0;
  const isEvenCol = col % 2 === 0;
  
  if (SNAKES[position]) return '#ef4444'; // Red for snake heads
  if (LADDERS[position]) return '#22c55e'; // Green for ladder bases
  
  return (isEvenRow ? isEvenCol : !isEvenCol) ? '#60a5fa' : '#93c5fd';
};

// Get 3D position from board position
const getPositionCoords = (position: number): { x: number; z: number } => {
  const row = Math.floor((position - 1) / BOARD_SIZE);
  const col = (position - 1) % BOARD_SIZE;
  const actualCol = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  
  return {
    x: actualCol * CELL_SIZE - BOARD_DIMENSION / 2 + CELL_SIZE / 2,
    z: row * CELL_SIZE - BOARD_DIMENSION / 2 + CELL_SIZE / 2,
  };
};

// 2D Board Component
function Board2D({ 
  currentPosition, 
  targetPosition 
}: { 
  currentPosition: number; 
  targetPosition: number | null;
}) {
  const cells = [];
  
  for (let row = BOARD_SIZE - 1; row >= 0; row--) {
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const actualCol = row % 2 === 1 ? BOARD_SIZE - 1 - col : col;
      const position = row * BOARD_SIZE + actualCol + 1;
      const isPlayer = position === currentPosition;
      const isTarget = position === targetPosition;
      
      rowCells.push(
        <div
          key={position}
          className={`
            w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center 
            text-xs sm:text-sm font-bold border border-gray-300 relative
            transition-all duration-300
            ${isPlayer ? 'ring-4 ring-yellow-400 z-10' : ''}
            ${isTarget ? 'ring-2 ring-purple-400' : ''}
          `}
          style={{ backgroundColor: getBoardColor(position) }}
        >
          <span className="text-gray-800">{position}</span>
          {isPlayer && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full shadow-lg animate-pulse border-2 border-white" />
            </div>
          )}
          {SNAKES[position] && (
            <span className="absolute bottom-0 right-0 text-xs">🐍</span>
          )}
          {LADDERS[position] && (
            <span className="absolute bottom-0 right-0 text-xs">🪜</span>
          )}
        </div>
      );
    }
    cells.push(
      <div key={row} className="flex">
        {rowCells}
      </div>
    );
  }
  
  return (
    <div className="inline-block bg-white p-2 rounded-lg shadow-xl">
      {cells}
    </div>
  );
}

// 3D Cell Component
function Cell3D({ position, isPlayer }: { position: number; isPlayer: boolean }) {
  const coords = getPositionCoords(position);
  const color = getBoardColor(position);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && isPlayer) {
      meshRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });
  
  return (
    <group position={[coords.x, 0, coords.z]}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[CELL_SIZE * 0.95, 0.1, CELL_SIZE * 0.95]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {position.toString()}
      </Text>
      {isPlayer && (
        <mesh ref={meshRef} position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

// Snake 3D Component
function Snake3D({ start, end }: { start: number; end: number }) {
  const startCoords = getPositionCoords(start);
  const endCoords = getPositionCoords(end);
  
  const points = [];
  const segments = 20;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startCoords.x + (endCoords.x - startCoords.x) * t;
    const z = startCoords.z + (endCoords.z - startCoords.z) * t;
    const y = 0.2 + Math.sin(t * Math.PI) * 0.5 + Math.sin(t * Math.PI * 4) * 0.1;
    points.push(new THREE.Vector3(x, y, z));
  }
  
  const curve = new THREE.CatmullRomCurve3(points);
  
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, 0.08, 8, false]} />
      <meshStandardMaterial color="#dc2626" />
    </mesh>
  );
}

// Ladder 3D Component
function Ladder3D({ start, end }: { start: number; end: number }) {
  const startCoords = getPositionCoords(start);
  const endCoords = getPositionCoords(end);
  
  const dx = endCoords.x - startCoords.x;
  const dz = endCoords.z - startCoords.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  
  const rungs = [];
  const numRungs = Math.floor(length / 0.8);
  
  for (let i = 1; i < numRungs; i++) {
    const t = i / numRungs;
    rungs.push(
      <mesh
        key={i}
        position={[
          startCoords.x + dx * t,
          0.3 + t * 0.5,
          startCoords.z + dz * t,
        ]}
        rotation={[0, angle, 0]}
      >
        <boxGeometry args={[0.4, 0.05, 0.05]} />
        <meshStandardMaterial color="#854d0e" />
      </mesh>
    );
  }
  
  return (
    <group>
      {/* Left rail */}
      <mesh position={[
        (startCoords.x + endCoords.x) / 2 - 0.15 * Math.cos(angle),
        0.4,
        (startCoords.z + endCoords.z) / 2 + 0.15 * Math.sin(angle),
      ]}>
        <cylinderGeometry args={[0.03, 0.03, length * 1.1, 8]} />
        <meshStandardMaterial color="#a16207" />
        <mesh rotation={[Math.PI / 2 - 0.3, 0, angle]}>
          <cylinderGeometry args={[0.03, 0.03, length * 1.1, 8]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
      </mesh>
      {/* Right rail */}
      <mesh position={[
        (startCoords.x + endCoords.x) / 2 + 0.15 * Math.cos(angle),
        0.4,
        (startCoords.z + endCoords.z) / 2 - 0.15 * Math.sin(angle),
      ]}>
        <cylinderGeometry args={[0.03, 0.03, length * 1.1, 8]} />
        <meshStandardMaterial color="#a16207" />
        <mesh rotation={[Math.PI / 2 - 0.3, 0, angle]}>
          <cylinderGeometry args={[0.03, 0.03, length * 1.1, 8]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
      </mesh>
      {rungs}
    </group>
  );
}

// 3D Board Component
function Board3D({ currentPosition }: { currentPosition: number }) {
  const cells = [];
  
  for (let i = 1; i <= 100; i++) {
    cells.push(
      <Cell3D key={i} position={i} isPlayer={currentPosition === i} />
    );
  }
  
  return (
    <group>
      {/* Base */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[BOARD_DIMENSION + 0.5, 0.1, BOARD_DIMENSION + 0.5]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {cells}
      
      {/* Snakes */}
      {Object.entries(SNAKES).map(([start, end]) => (
        <Snake3D key={`snake-${start}`} start={parseInt(start)} end={end} />
      ))}
      
      {/* Ladders */}
      {Object.entries(LADDERS).map(([start, end]) => (
        <Ladder3D key={`ladder-${start}`} start={parseInt(start)} end={end} />
      ))}
    </group>
  );
}

// First Person Camera Controller
function FirstPersonController({ 
  currentPosition, 
  enabled 
}: { 
  currentPosition: number;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const rotationRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        rotationRef.current.y -= e.movementX * 0.002;
        rotationRef.current.x -= e.movementY * 0.002;
        rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled]);
  
  useEffect(() => {
    if (enabled) {
      const coords = getPositionCoords(currentPosition);
      camera.position.set(coords.x, 0.5, coords.z);
    }
  }, [currentPosition, camera, enabled]);
  
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    if (!enabled) return;
    
    const speed = 0.08;
    const direction = new THREE.Vector3();
    
    if (keysRef.current.has('w') || keysRef.current.has('arrowup')) {
      direction.z -= 1;
    }
    if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) {
      direction.z += 1;
    }
    if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) {
      direction.x -= 1;
    }
    if (keysRef.current.has('d') || keysRef.current.has('arrowright')) {
      direction.x += 1;
    }
    
    if (direction.length() > 0) {
      direction.normalize();
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRef.current.y);
      camera.position.add(direction.multiplyScalar(speed));
    }
    
    // Keep player within board bounds using clamp
    const halfBoard = BOARD_DIMENSION / 2 + 1;
    camera.position.clamp(
      new THREE.Vector3(-halfBoard, 0.3, -halfBoard),
      new THREE.Vector3(halfBoard, 3, halfBoard)
    );
    
    // Apply rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = rotationRef.current.y;
    camera.rotation.x = rotationRef.current.x;
  });
  /* eslint-enable react-hooks/immutability */
  
  return null;
}

// Scene Component
function Scene({ 
  currentPosition, 
  mode 
}: { 
  currentPosition: number;
  mode: number;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />
      
      <Board3D currentPosition={currentPosition} />
      
      {mode === 2 && (
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={20}
          target={[0, 0, 0]}
        />
      )}
      
      {mode === 3 && (
        <FirstPersonController currentPosition={currentPosition} enabled={true} />
      )}
      
      {mode === 2 && (
        <PerspectiveCamera makeDefault position={[8, 10, 8]} fov={60} />
      )}
      
      {mode === 3 && (
        <PerspectiveCamera makeDefault position={[0, 0.5, 0]} fov={75} />
      )}
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
    </>
  );
}

// Dice Component
function Dice({ 
  value, 
  rolling, 
  onRoll 
}: { 
  value: number;
  rolling: boolean;
  onRoll: () => void;
}) {
  const dots: Record<number, React.ReactNode> = {
    1: (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-gray-800 rounded-full" />
      </div>
    ),
    2: (
      <div className="absolute inset-0 p-2">
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
      </div>
    ),
    3: (
      <div className="absolute inset-0 p-2">
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
      </div>
    ),
    4: (
      <div className="absolute inset-0 p-2">
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 right-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
      </div>
    ),
    5: (
      <div className="absolute inset-0 p-2">
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 right-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
      </div>
    ),
    6: (
      <div className="absolute inset-0 p-2">
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 right-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-1/2 left-2 -translate-y-1/2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-1/2 right-2 -translate-y-1/2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 left-2" />
        <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
      </div>
    ),
  };
  
  return (
    <button
      onClick={onRoll}
      disabled={rolling}
      className={`
        relative w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-gray-200
        ${rolling ? 'animate-bounce cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}
        transition-transform
      `}
    >
      {dots[value]}
    </button>
  );
}

// Main Game Component
export default function SnakeLadderGame() {
  const [mode, setMode] = useState(1);
  const [position, setPosition] = useState(1);
  const [diceValue, setDiceValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);
  const [gameMessage, setGameMessage] = useState('Roll the dice to start!');
  const [gameWon, setGameWon] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const rollDice = useCallback(() => {
    if (rolling || gameWon) return;
    
    setRolling(true);
    setGameMessage('Rolling...');
    
    // Animate dice
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      
      if (rollCount >= 10) {
        clearInterval(rollInterval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        
        // Calculate new position
        const newPosition = position + finalValue;
        
        if (newPosition > 100) {
          setGameMessage(`Need exactly ${100 - position} to win!`);
          setRolling(false);
          return;
        }
        
        setTargetPosition(newPosition);
        setGameMessage(`Rolled ${finalValue}! Moving to ${newPosition}...`);
        
        // Animate movement
        setTimeout(() => {
          // Check for snakes or ladders
          if (SNAKES[newPosition]) {
            const snakeEnd = SNAKES[newPosition];
            setGameMessage(`🐍 Snake! Sliding down from ${newPosition} to ${snakeEnd}`);
            setTimeout(() => {
              setPosition(snakeEnd);
              setTargetPosition(null);
              setRolling(false);
            }, 1000);
          } else if (LADDERS[newPosition]) {
            const ladderEnd = LADDERS[newPosition];
            setGameMessage(`🪜 Ladder! Climbing up from ${newPosition} to ${ladderEnd}`);
            setTimeout(() => {
              setPosition(ladderEnd);
              setTargetPosition(null);
              setRolling(false);
            }, 1000);
          } else {
            setPosition(newPosition);
            setTargetPosition(null);
            setRolling(false);
            
            if (newPosition === 100) {
              setGameWon(true);
              setGameMessage('🎉 Congratulations! You Won!');
            } else {
              setGameMessage(`You are now at position ${newPosition}`);
            }
          }
        }, 500);
      }
    }, 100);
  }, [position, rolling, gameWon]);
  
  const resetGame = useCallback(() => {
    setPosition(1);
    setDiceValue(1);
    setGameWon(false);
    setGameMessage('Roll the dice to start!');
    setTargetPosition(null);
  }, []);
  
  const requestPointerLock = useCallback(() => {
    if (mode === 3 && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  }, [mode]);
  
   return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-white hover:text-blue-400 transition flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio
          </Link>
          <h1 className="text-2xl font-bold text-white">🎲 Snake & Ladder</h1>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Reset Game
          </button>
        </div>
      </header>
      
      {/* Mode Selector */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setMode(1)}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              mode === 1 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Mode 1: Classic 2D
          </button>
          <button
            onClick={() => setMode(2)}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              mode === 2 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Mode 2: 3D Rotatable
          </button>
          <button
            onClick={() => setMode(3)}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              mode === 3 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Mode 3: First Person
          </button>
        </div>
        
        {mode === 3 && (
          <p className="text-center text-yellow-400 mt-2 text-sm">
            Click on the game area and use WASD or Arrow keys to move. Mouse to look around.
          </p>
        )}
      </div>
      
      {/* Game Area */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            {mode === 1 ? (
              <div className="flex justify-center items-center bg-slate-700 rounded-xl p-4 min-h-[500px]">
                <Board2D currentPosition={position} targetPosition={targetPosition} />
              </div>
            ) : (
              <div 
                ref={canvasRef}
                onClick={requestPointerLock}
                className="bg-slate-700 rounded-xl overflow-hidden"
                style={{ height: '600px' }}
              >
                <Canvas shadows>
                  <Scene currentPosition={position} mode={mode} />
                </Canvas>
              </div>
            )}
          </div>
          
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700 rounded-xl p-6 space-y-6">
              {/* Game Status */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-2">Game Status</h2>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-300 text-sm">{gameMessage}</p>
                  <p className="text-2xl font-bold text-blue-400 mt-2">Position: {position}</p>
                </div>
              </div>
              
              {/* Dice */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-4">Roll Dice</h2>
                <div className="flex justify-center">
                  <Dice value={diceValue} rolling={rolling} onRoll={rollDice} />
                </div>
                <button
                  onClick={rollDice}
                  disabled={rolling || gameWon}
                  className={`
                    mt-4 w-full py-3 rounded-lg font-semibold transition
                    ${rolling || gameWon
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    }
                  `}
                >
                  {gameWon ? '🎉 You Won!' : rolling ? 'Rolling...' : 'Roll Dice'}
                </button>
              </div>
              
              {/* Legend */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Legend</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span className="text-slate-300">🐍 Snake Head (Go Down)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span className="text-slate-300">🪜 Ladder Base (Go Up)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                    <span className="text-slate-300">Your Position</span>
                  </div>
                </div>
              </div>
              
              {/* Snakes & Ladders Info */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Snakes</h2>
                <div className="space-y-1 text-sm text-slate-300">
                  {Object.entries(SNAKES).map(([start, end]) => (
                    <p key={start}>🐍 {start} → {end}</p>
                  ))}
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Ladders</h2>
                <div className="space-y-1 text-sm text-slate-300">
                  {Object.entries(LADDERS).map(([start, end]) => (
                    <p key={start}>🪜 {start} → {end}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions Modal for Mode 3 */}
      {mode === 3 && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 max-w-xs">
          <h3 className="font-semibold text-white mb-2">Controls (Mode 3)</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• WASD / Arrow Keys: Move</li>
            <li>• Mouse: Look around</li>
            <li>• Click canvas to enable controls</li>
            <li>• ESC: Release mouse</li>
          </ul>
        </div>
      )}
      
      {/* Victory Modal */}
      {gameWon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
            <p className="text-slate-300 mb-6">You&apos;ve reached position 100 and won the game!</p>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

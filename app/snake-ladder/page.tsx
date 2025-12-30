'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';

// Game constants
const BOARD_SIZE = 10;
const CELL_SIZE = 1;
const BOARD_DIMENSION = BOARD_SIZE * CELL_SIZE;

// First person mode uses larger scale
const FP_SCALE = 3; // Scale factor for first person mode
const FP_CELL_SIZE = CELL_SIZE * FP_SCALE;
const FP_BOARD_DIMENSION = BOARD_SIZE * FP_CELL_SIZE;
const WALL_HEIGHT = 4; // Height of row separator walls (zigzag pattern)
const OUTER_WALL_HEIGHT = 4; // Height of outer walls (taller than player view)

// Player colors
const PLAYER_COLORS = ['#eab308', '#ef4444', '#22c55e', '#3b82f6']; // Yellow, Red, Green, Blue
const PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

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
const getPositionCoords = (position: number, scale: number = 1): { x: number; z: number } => {
  const row = Math.floor((position - 1) / BOARD_SIZE);
  const col = (position - 1) % BOARD_SIZE;
  const actualCol = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  const cellSize = CELL_SIZE * scale;
  const boardDimension = BOARD_SIZE * cellSize;
  
  return {
    x: actualCol * cellSize - boardDimension / 2 + cellSize / 2,
    z: row * cellSize - boardDimension / 2 + cellSize / 2,
  };
};

// SVG Path for snake in 2D mode
function getSnakePath(startPos: number, endPos: number, cellWidth: number, cellHeight: number): string {
  // Calculate start and end cell coordinates
  const startRow = Math.floor((startPos - 1) / BOARD_SIZE);
  const startCol = (startPos - 1) % BOARD_SIZE;
  const actualStartCol = startRow % 2 === 1 ? BOARD_SIZE - 1 - startCol : startCol;
  
  const endRow = Math.floor((endPos - 1) / BOARD_SIZE);
  const endCol = (endPos - 1) % BOARD_SIZE;
  const actualEndCol = endRow % 2 === 1 ? BOARD_SIZE - 1 - endCol : endCol;
  
  // Convert to pixel coordinates (note: rows are inverted in display)
  const startX = actualStartCol * cellWidth + cellWidth / 2;
  const startY = (BOARD_SIZE - 1 - startRow) * cellHeight + cellHeight / 2;
  const endX = actualEndCol * cellWidth + cellWidth / 2;
  const endY = (BOARD_SIZE - 1 - endRow) * cellHeight + cellHeight / 2;
  
  // Create a wavy path for snake
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length * 20;
  const perpY = dx / length * 20;
  
  return `M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`;
}

// SVG Path for ladder in 2D mode
function getLadderPath(startPos: number, endPos: number, cellWidth: number, cellHeight: number): { left: string; right: string; rungs: Array<{ x1: number; y1: number; x2: number; y2: number }> } {
  const startRow = Math.floor((startPos - 1) / BOARD_SIZE);
  const startCol = (startPos - 1) % BOARD_SIZE;
  const actualStartCol = startRow % 2 === 1 ? BOARD_SIZE - 1 - startCol : startCol;
  
  const endRow = Math.floor((endPos - 1) / BOARD_SIZE);
  const endCol = (endPos - 1) % BOARD_SIZE;
  const actualEndCol = endRow % 2 === 1 ? BOARD_SIZE - 1 - endCol : endCol;
  
  const startX = actualStartCol * cellWidth + cellWidth / 2;
  const startY = (BOARD_SIZE - 1 - startRow) * cellHeight + cellHeight / 2;
  const endX = actualEndCol * cellWidth + cellWidth / 2;
  const endY = (BOARD_SIZE - 1 - endRow) * cellHeight + cellHeight / 2;
  
  // Calculate perpendicular offset for ladder rails
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length * 8;
  const perpY = dx / length * 8;
  
  // Create rungs
  const numRungs = Math.max(3, Math.floor(length / 25));
  const rungs = [];
  for (let i = 1; i < numRungs; i++) {
    const t = i / numRungs;
    const rungX = startX + dx * t;
    const rungY = startY + dy * t;
    rungs.push({
      x1: rungX - perpX,
      y1: rungY - perpY,
      x2: rungX + perpX,
      y2: rungY + perpY
    });
  }
  
  return {
    left: `M ${startX - perpX} ${startY - perpY} L ${endX - perpX} ${endY - perpY}`,
    right: `M ${startX + perpX} ${startY + perpY} L ${endX + perpX} ${endY + perpY}`,
    rungs
  };
}

// 2D Board Component
function Board2D({ 
  playerPositions, 
  currentPlayerIndex,
  targetPosition,
  numPlayers
}: { 
  playerPositions: number[];
  currentPlayerIndex: number;
  targetPosition: number | null;
  numPlayers: number;
}) {
  const cellWidth = 48; // sm:w-12 = 48px
  const cellHeight = 48;
  const boardWidth = BOARD_SIZE * cellWidth;
  const boardHeight = BOARD_SIZE * cellHeight;
  
  const cells = [];
  
  for (let row = BOARD_SIZE - 1; row >= 0; row--) {
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const actualCol = row % 2 === 1 ? BOARD_SIZE - 1 - col : col;
      const position = row * BOARD_SIZE + actualCol + 1;
      const playersHere = playerPositions
        .map((pos, idx) => ({ pos, idx }))
        .filter(p => p.pos === position && p.idx < numPlayers);
      const isTarget = position === targetPosition;
      
      rowCells.push(
        <div
          key={position}
          className={`
            w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center 
            text-xs sm:text-sm font-bold border border-gray-300 relative
            transition-all duration-300
            ${playersHere.some(p => p.idx === currentPlayerIndex) ? 'ring-4 ring-yellow-400 z-10' : ''}
            ${isTarget ? 'ring-2 ring-purple-400' : ''}
          `}
          style={{ backgroundColor: getBoardColor(position) }}
        >
          <span className="text-gray-800 z-0">{position}</span>
          {playersHere.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center gap-0.5 flex-wrap p-1">
              {playersHere.map(({ idx }) => (
                <div 
                  key={idx}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-lg border-2 border-white ${
                    idx === currentPlayerIndex ? 'animate-pulse' : ''
                  }`}
                  style={{ backgroundColor: PLAYER_COLORS[idx] }}
                />
              ))}
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
    <div className="inline-block bg-white p-2 rounded-lg shadow-xl relative">
      {/* Board cells */}
      <div className="relative z-10">
        {cells}
      </div>
      
      {/* SVG overlay for snakes and ladders - uses multiply blend mode to show lines over cells while preserving cell colors */}
      <svg 
        className="absolute top-2 left-2 pointer-events-none z-20"
        width={boardWidth}
        height={boardHeight}
        style={{ mixBlendMode: 'multiply' }}
      >
        {/* Render Ladders */}
        {Object.entries(LADDERS).map(([start, end]) => {
          const ladder = getLadderPath(parseInt(start), end, cellWidth, cellHeight);
          return (
            <g key={`ladder-${start}`}>
              <path 
                d={ladder.left} 
                stroke="#854d0e" 
                strokeWidth="4" 
                fill="none"
                strokeLinecap="round"
              />
              <path 
                d={ladder.right} 
                stroke="#854d0e" 
                strokeWidth="4" 
                fill="none"
                strokeLinecap="round"
              />
              {ladder.rungs.map((rung, i) => (
                <line 
                  key={i}
                  x1={rung.x1} 
                  y1={rung.y1} 
                  x2={rung.x2} 
                  y2={rung.y2}
                  stroke="#a16207"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              ))}
            </g>
          );
        })}
        
        {/* Render Snakes */}
        {Object.entries(SNAKES).map(([start, end]) => {
          const path = getSnakePath(parseInt(start), end, cellWidth, cellHeight);
          return (
            <g key={`snake-${start}`}>
              <path 
                d={path} 
                stroke="#dc2626" 
                strokeWidth="8" 
                fill="none"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path 
                d={path} 
                stroke="#fca5a5" 
                strokeWidth="4" 
                fill="none"
                strokeLinecap="round"
                strokeDasharray="2,8"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 3D Cell Component
function Cell3D({ 
  position, 
  playerIndices,
  currentPlayerIndex,
  scale = 1 
}: { 
  position: number; 
  playerIndices: number[];
  currentPlayerIndex: number;
  scale?: number;
}) {
  const coords = getPositionCoords(position, scale);
  const color = getBoardColor(position);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const cellSize = CELL_SIZE * scale;
  
  useFrame((state) => {
    playerIndices.forEach((playerIdx, i) => {
      const mesh = meshRefs.current[i];
      if (mesh && playerIdx === currentPlayerIndex) {
        mesh.position.y = 0.2 * scale + Math.sin(state.clock.elapsedTime * 3) * 0.05 * scale;
      }
    });
  });
  
  // Calculate player positions within the cell
  const getPlayerOffset = (idx: number, total: number) => {
    if (total === 1) return { x: 0, z: 0 };
    const offsets = [
      { x: -0.2, z: -0.2 },
      { x: 0.2, z: -0.2 },
      { x: -0.2, z: 0.2 },
      { x: 0.2, z: 0.2 }
    ];
    return { x: offsets[idx].x * scale, z: offsets[idx].z * scale };
  };
  
  return (
    <group position={[coords.x, 0, coords.z]}>
      <mesh position={[0, -0.05 * scale, 0]}>
        <boxGeometry args={[cellSize * 0.95, 0.1 * scale, cellSize * 0.95]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 0.01 * scale, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25 * scale}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {position.toString()}
      </Text>
      {playerIndices.map((playerIdx, i) => {
        const offset = getPlayerOffset(i, playerIndices.length);
        return (
          <mesh 
            key={playerIdx}
            ref={el => { meshRefs.current[i] = el; }}
            position={[offset.x, 0.3 * scale, offset.z]}
          >
            <sphereGeometry args={[0.15 * scale, 32, 32]} />
            <meshStandardMaterial 
              color={PLAYER_COLORS[playerIdx]} 
              emissive={PLAYER_COLORS[playerIdx]} 
              emissiveIntensity={playerIdx === currentPlayerIndex ? 0.5 : 0.2} 
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Snake 3D Component - Cleaner version
function Snake3D({ start, end, scale = 1 }: { start: number; end: number; scale?: number }) {
  const startCoords = getPositionCoords(start, scale);
  const endCoords = getPositionCoords(end, scale);
  
  // Create smooth curved path for snake
  const points = [];
  const segments = 30;
  const dx = endCoords.x - startCoords.x;
  const dz = endCoords.z - startCoords.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startCoords.x + dx * t;
    const z = startCoords.z + dz * t;
    // Smooth arc with gentle wave
    const baseHeight = 0.15 * scale;
    const arcHeight = Math.sin(t * Math.PI) * 0.3 * scale;
    const waveHeight = Math.sin(t * Math.PI * 3) * 0.05 * scale;
    const y = baseHeight + arcHeight + waveHeight;
    points.push(new THREE.Vector3(x, y, z));
  }
  
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeRadius = 0.06 * scale;
  
  return (
    <group>
      {/* Snake body */}
      <mesh>
        <tubeGeometry args={[curve, 64, tubeRadius, 12, false]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} />
      </mesh>
      {/* Snake head */}
      <mesh position={[startCoords.x, 0.2 * scale, startCoords.z]}>
        <sphereGeometry args={[tubeRadius * 1.5, 16, 16]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.3} />
      </mesh>
      {/* Snake eyes */}
      <mesh position={[startCoords.x - 0.03 * scale, 0.25 * scale, startCoords.z - 0.05 * scale]}>
        <sphereGeometry args={[tubeRadius * 0.4, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[startCoords.x + 0.03 * scale, 0.25 * scale, startCoords.z - 0.05 * scale]}>
        <sphereGeometry args={[tubeRadius * 0.4, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}

// Ladder 3D Component - Height proportional to distance
const LADDER_HEIGHT_RATIO = 0.3; // Ratio of horizontal distance to ladder height

function Ladder3D({ start, end, scale = 1 }: { start: number; end: number; scale?: number }) {
  const startCoords = getPositionCoords(start, scale);
  const endCoords = getPositionCoords(end, scale);
  
  const dx = endCoords.x - startCoords.x;
  const dz = endCoords.z - startCoords.z;
  const horizontalLength = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  
  // Ladder height proportional to horizontal distance (not too tall)
  const ladderHeight = horizontalLength * LADDER_HEIGHT_RATIO;
  
  // Calculate perpendicular direction for rail spacing
  const perpX = -Math.cos(angle) * 0.12 * scale;
  const perpZ = Math.sin(angle) * 0.12 * scale;
  
  const rungs = [];
  const numRungs = Math.max(3, Math.floor(horizontalLength / (0.6 * scale)));
  
  for (let i = 1; i < numRungs; i++) {
    const t = i / numRungs;
    const x = startCoords.x + dx * t;
    const z = startCoords.z + dz * t;
    const y = 0.1 * scale + t * ladderHeight;
    
    rungs.push(
      <mesh
        key={i}
        position={[x, y, z]}
        rotation={[0, angle, 0]}
      >
        <boxGeometry args={[0.28 * scale, 0.03 * scale, 0.03 * scale]} />
        <meshStandardMaterial color="#a16207" roughness={0.5} />
      </mesh>
    );
  }
  
  // Rail length calculation (diagonal length considering height)
  const railLength = Math.sqrt(horizontalLength * horizontalLength + ladderHeight * ladderHeight) * 1.05;
  const railMidX = (startCoords.x + endCoords.x) / 2;
  const railMidZ = (startCoords.z + endCoords.z) / 2;
  const railMidY = 0.1 * scale + ladderHeight / 2;
  
  // Calculate tilt angle based on height and distance
  const tiltAngle = Math.atan2(ladderHeight, horizontalLength);
  
  return (
    <group>
      {/* Left rail */}
      <mesh 
        position={[railMidX + perpX, railMidY, railMidZ + perpZ]}
        rotation={[tiltAngle, 0, -angle + Math.PI / 2]}
      >
        <cylinderGeometry args={[0.025 * scale, 0.025 * scale, railLength, 8]} />
        <meshStandardMaterial color="#854d0e" roughness={0.5} />
      </mesh>
      {/* Right rail */}
      <mesh 
        position={[railMidX - perpX, railMidY, railMidZ - perpZ]}
        rotation={[tiltAngle, 0, -angle + Math.PI / 2]}
      >
        <cylinderGeometry args={[0.025 * scale, 0.025 * scale, railLength, 8]} />
        <meshStandardMaterial color="#854d0e" roughness={0.5} />
      </mesh>
      {rungs}
    </group>
  );
}

// 3D Board Component
function Board3D({ 
  playerPositions, 
  currentPlayerIndex,
  numPlayers,
  scale = 1 
}: { 
  playerPositions: number[];
  currentPlayerIndex: number;
  numPlayers: number;
  scale?: number;
}) {
  const cells = [];
  const cellSize = CELL_SIZE * scale;
  const boardDimension = BOARD_SIZE * cellSize;
  
  // Group players by position
  const positionToPlayers: Record<number, number[]> = {};
  for (let i = 0; i < numPlayers; i++) {
    const pos = playerPositions[i];
    if (!positionToPlayers[pos]) {
      positionToPlayers[pos] = [];
    }
    positionToPlayers[pos].push(i);
  }
  
  for (let i = 1; i <= 100; i++) {
    cells.push(
      <Cell3D 
        key={i} 
        position={i} 
        playerIndices={positionToPlayers[i] || []}
        currentPlayerIndex={currentPlayerIndex}
        scale={scale}
      />
    );
  }
  
  return (
    <group>
      {/* Base */}
      <mesh position={[0, -0.15 * scale, 0]}>
        <boxGeometry args={[boardDimension + 0.5 * scale, 0.1 * scale, boardDimension + 0.5 * scale]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {cells}
      
      {/* Snakes */}
      {Object.entries(SNAKES).map(([start, end]) => (
        <Snake3D key={`snake-${start}`} start={parseInt(start)} end={end} scale={scale} />
      ))}
      
      {/* Ladders */}
      {Object.entries(LADDERS).map(([start, end]) => (
        <Ladder3D key={`ladder-${start}`} start={parseInt(start)} end={end} scale={scale} />
      ))}
    </group>
  );
}

// First Person Cell 3D Component with walls only at row separators (zigzag pattern)
function FPCell3D({ 
  position, 
  playerIndices,
  currentPlayerIndex
}: { 
  position: number; 
  playerIndices: number[];
  currentPlayerIndex: number;
}) {
  const coords = getPositionCoords(position, FP_SCALE);
  const color = getBoardColor(position);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  
  useFrame((state) => {
    playerIndices.forEach((playerIdx, i) => {
      const mesh = meshRefs.current[i];
      if (mesh && playerIdx === currentPlayerIndex) {
        mesh.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      }
    });
  });
  
  // Calculate player positions within the cell
  const getPlayerOffset = (idx: number, total: number) => {
    if (total === 1) return { x: 0, z: 0 };
    const offsets = [
      { x: -0.6, z: -0.6 },
      { x: 0.6, z: -0.6 },
      { x: -0.6, z: 0.6 },
      { x: 0.6, z: 0.6 }
    ];
    return offsets[idx];
  };
  
  // Calculate row and col for wall placement
  const row = Math.floor((position - 1) / BOARD_SIZE);
  const col = (position - 1) % BOARD_SIZE;
  const actualCol = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  
  // Zigzag pattern wall logic:
  // In snake and ladder, the path goes in a zigzag. Row separators are where the path turns.
  // - For even rows (0, 2, 4...), path goes left to right, wall at right end (last column)
  // - For odd rows (1, 3, 5...), path goes right to left, wall at left end (first column)
  // We also need walls between rows (north walls when moving to next row)
  
  // Show wall at the end of each row (where zigzag turns)
  const isEvenRow = row % 2 === 0;
  const isLastColumn = actualCol === BOARD_SIZE - 1;
  const isFirstColumn = actualCol === 0;
  const showTurnWall = (isEvenRow && isLastColumn) || (!isEvenRow && isFirstColumn);
  
  // Show wall between rows at the turning point
  const showRowSeparator = row < BOARD_SIZE - 1;
  
  const wallThickness = 0.15;
  const wallColor = '#374151';
  
  // Calculate wall position offset for side walls at zigzag turns
  const sideWallOffset = isEvenRow ? FP_CELL_SIZE / 2 : -FP_CELL_SIZE / 2;
  
  return (
    <group position={[coords.x, 0, coords.z]}>
      {/* Floor tile */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[FP_CELL_SIZE * 0.98, 0.1, FP_CELL_SIZE * 0.98]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Upright number text */}
      <Text
        position={[0, 0.5, 0]}
        rotation={[0, 0, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {position.toString()}
      </Text>
      
      {/* Row separator walls (zigzag pattern) - only at turn points */}
      {showTurnWall && showRowSeparator && (
        <mesh position={[0, WALL_HEIGHT / 2, FP_CELL_SIZE / 2]}>
          <boxGeometry args={[FP_CELL_SIZE, WALL_HEIGHT, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
      )}
      
      {/* Side wall at zigzag turn - vertical wall where path turns */}
      {showTurnWall && row < BOARD_SIZE - 1 && (
        <mesh position={[sideWallOffset, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[wallThickness, WALL_HEIGHT, FP_CELL_SIZE]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
      )}
      
      {/* Players */}
      {playerIndices.map((playerIdx, i) => {
        const offset = getPlayerOffset(i, playerIndices.length);
        return (
          <mesh 
            key={playerIdx}
            ref={el => { meshRefs.current[i] = el; }}
            position={[offset.x, 0.6, offset.z]}
          >
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial 
              color={PLAYER_COLORS[playerIdx]} 
              emissive={PLAYER_COLORS[playerIdx]} 
              emissiveIntensity={playerIdx === currentPlayerIndex ? 0.5 : 0.2} 
            />
          </mesh>
        );
      })}
    </group>
  );
}

// First Person Board Component with walls (maze-like)
function FPBoard3D({ 
  playerPositions, 
  currentPlayerIndex,
  numPlayers
}: { 
  playerPositions: number[];
  currentPlayerIndex: number;
  numPlayers: number;
}) {
  const cells = [];
  
  // Group players by position
  const positionToPlayers: Record<number, number[]> = {};
  for (let i = 0; i < numPlayers; i++) {
    const pos = playerPositions[i];
    if (!positionToPlayers[pos]) {
      positionToPlayers[pos] = [];
    }
    positionToPlayers[pos].push(i);
  }
  
  for (let i = 1; i <= 100; i++) {
    cells.push(
      <FPCell3D 
        key={i} 
        position={i} 
        playerIndices={positionToPlayers[i] || []}
        currentPlayerIndex={currentPlayerIndex}
      />
    );
  }
  
  // Outer walls
  const outerWalls = [];
  const halfBoard = FP_BOARD_DIMENSION / 2;
  
  // North wall
  outerWalls.push(
    <mesh key="north" position={[0, OUTER_WALL_HEIGHT / 2, halfBoard + 0.05]}>
      <boxGeometry args={[FP_BOARD_DIMENSION + 0.2, OUTER_WALL_HEIGHT, 0.1]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  );
  // South wall
  outerWalls.push(
    <mesh key="south" position={[0, OUTER_WALL_HEIGHT / 2, -halfBoard - 0.05]}>
      <boxGeometry args={[FP_BOARD_DIMENSION + 0.2, OUTER_WALL_HEIGHT, 0.1]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  );
  // East wall
  outerWalls.push(
    <mesh key="east" position={[halfBoard + 0.05, OUTER_WALL_HEIGHT / 2, 0]}>
      <boxGeometry args={[0.1, OUTER_WALL_HEIGHT, FP_BOARD_DIMENSION + 0.2]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  );
  // West wall
  outerWalls.push(
    <mesh key="west" position={[-halfBoard - 0.05, OUTER_WALL_HEIGHT / 2, 0]}>
      <boxGeometry args={[0.1, OUTER_WALL_HEIGHT, FP_BOARD_DIMENSION + 0.2]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  );
  
  return (
    <group>
      {/* Base */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[FP_BOARD_DIMENSION + 1, 0.1, FP_BOARD_DIMENSION + 1]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {cells}
      {outerWalls}
      
      {/* Snakes */}
      {Object.entries(SNAKES).map(([start, end]) => (
        <Snake3D key={`snake-${start}`} start={parseInt(start)} end={end} scale={FP_SCALE} />
      ))}
      
      {/* Ladders */}
      {Object.entries(LADDERS).map(([start, end]) => (
        <Ladder3D key={`ladder-${start}`} start={parseInt(start)} end={end} scale={FP_SCALE} />
      ))}
    </group>
  );
}

// First Person Camera Controller - starts at cell 1, player feels smaller
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
  const initializedRef = useRef(false);
  
  // Player eye height (lower than wall height to feel inside the world)
  const PLAYER_EYE_HEIGHT = 1.2; // Lower than WALL_HEIGHT (4) and OUTER_WALL_HEIGHT (4)
  
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
  
  // Initialize camera position at cell 1 when first entering mode 3
  useEffect(() => {
    if (enabled && !initializedRef.current) {
      // Start at cell 1
      const coords = getPositionCoords(1, FP_SCALE);
      camera.position.set(coords.x, PLAYER_EYE_HEIGHT, coords.z);
      rotationRef.current = { x: 0, y: 0 };
      initializedRef.current = true;
    }
    if (!enabled) {
      initializedRef.current = false;
    }
  }, [camera, enabled]);
  
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    if (!enabled) return;
    
    const speed = 0.15;
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
    const halfBoard = FP_BOARD_DIMENSION / 2 - 0.5;
    camera.position.clamp(
      new THREE.Vector3(-halfBoard, PLAYER_EYE_HEIGHT, -halfBoard),
      new THREE.Vector3(halfBoard, PLAYER_EYE_HEIGHT, halfBoard)
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
  playerPositions,
  currentPlayerIndex,
  numPlayers,
  mode 
}: { 
  playerPositions: number[];
  currentPlayerIndex: number;
  numPlayers: number;
  mode: number;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />
      
      {mode === 2 && (
        <Board3D 
          playerPositions={playerPositions} 
          currentPlayerIndex={currentPlayerIndex}
          numPlayers={numPlayers}
        />
      )}
      
      {mode === 3 && (
        <FPBoard3D 
          playerPositions={playerPositions} 
          currentPlayerIndex={currentPlayerIndex}
          numPlayers={numPlayers}
        />
      )}
      
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
        <FirstPersonController currentPosition={playerPositions[currentPlayerIndex]} enabled={true} />
      )}
      
      {mode === 2 && (
        <PerspectiveCamera makeDefault position={[8, 10, 8]} fov={60} />
      )}
      
      {mode === 3 && (() => {
        // Start camera at cell 1 position
        const cell1Coords = getPositionCoords(1, FP_SCALE);
        return <PerspectiveCamera makeDefault position={[cell1Coords.x, 1.2, cell1Coords.z]} fov={75} />;
      })()}
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <planeGeometry args={[100, 100]} />
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
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerPositions, setPlayerPositions] = useState([1, 1, 1, 1]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);
  const [gameMessage, setGameMessage] = useState('Player 1, roll the dice to start!');
  const [winner, setWinner] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const rollDice = useCallback(() => {
    if (rolling || winner !== null) return;
    
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
        
        const currentPosition = playerPositions[currentPlayerIndex];
        // Calculate new position
        const newPosition = currentPosition + finalValue;
        
        if (newPosition > 100) {
          setGameMessage(`${PLAYER_NAMES[currentPlayerIndex]} needs exactly ${100 - currentPosition} to win!`);
          // Move to next player
          setTimeout(() => {
            const nextPlayer = (currentPlayerIndex + 1) % numPlayers;
            setCurrentPlayerIndex(nextPlayer);
            setGameMessage(`${PLAYER_NAMES[nextPlayer]}'s turn - Roll the dice!`);
            setRolling(false);
          }, 1500);
          return;
        }
        
        setTargetPosition(newPosition);
        setGameMessage(`${PLAYER_NAMES[currentPlayerIndex]} rolled ${finalValue}! Moving to ${newPosition}...`);
        
        // Animate movement
        setTimeout(() => {
          // Check for snakes or ladders
          if (SNAKES[newPosition]) {
            const snakeEnd = SNAKES[newPosition];
            setGameMessage(`🐍 Snake! ${PLAYER_NAMES[currentPlayerIndex]} slides down from ${newPosition} to ${snakeEnd}`);
            setTimeout(() => {
              setPlayerPositions(prev => {
                const newPositions = [...prev];
                newPositions[currentPlayerIndex] = snakeEnd;
                return newPositions;
              });
              setTargetPosition(null);
              // Move to next player
              const nextPlayer = (currentPlayerIndex + 1) % numPlayers;
              setCurrentPlayerIndex(nextPlayer);
              setGameMessage(`${PLAYER_NAMES[nextPlayer]}'s turn - Roll the dice!`);
              setRolling(false);
            }, 1000);
          } else if (LADDERS[newPosition]) {
            const ladderEnd = LADDERS[newPosition];
            setGameMessage(`🪜 Ladder! ${PLAYER_NAMES[currentPlayerIndex]} climbs up from ${newPosition} to ${ladderEnd}`);
            setTimeout(() => {
              setPlayerPositions(prev => {
                const newPositions = [...prev];
                newPositions[currentPlayerIndex] = ladderEnd;
                return newPositions;
              });
              setTargetPosition(null);
              
              if (ladderEnd === 100) {
                setWinner(currentPlayerIndex);
                setGameMessage(`🎉 ${PLAYER_NAMES[currentPlayerIndex]} Won!`);
              } else {
                // Move to next player
                const nextPlayer = (currentPlayerIndex + 1) % numPlayers;
                setCurrentPlayerIndex(nextPlayer);
                setGameMessage(`${PLAYER_NAMES[nextPlayer]}'s turn - Roll the dice!`);
              }
              setRolling(false);
            }, 1000);
          } else {
            setPlayerPositions(prev => {
              const newPositions = [...prev];
              newPositions[currentPlayerIndex] = newPosition;
              return newPositions;
            });
            setTargetPosition(null);
            
            if (newPosition === 100) {
              setWinner(currentPlayerIndex);
              setGameMessage(`🎉 ${PLAYER_NAMES[currentPlayerIndex]} Won!`);
              setRolling(false);
            } else {
              // Move to next player
              const nextPlayer = (currentPlayerIndex + 1) % numPlayers;
              setCurrentPlayerIndex(nextPlayer);
              setGameMessage(`${PLAYER_NAMES[nextPlayer]}'s turn - Roll the dice!`);
              setRolling(false);
            }
          }
        }, 500);
      }
    }, 100);
  }, [playerPositions, currentPlayerIndex, rolling, winner, numPlayers]);
  
  const resetGame = useCallback(() => {
    setPlayerPositions([1, 1, 1, 1]);
    setCurrentPlayerIndex(0);
    setDiceValue(1);
    setWinner(null);
    setGameMessage('Player 1, roll the dice to start!');
    setTargetPosition(null);
    setGameStarted(false);
  }, []);
  
  const startGame = useCallback(() => {
    setGameStarted(true);
    setGameMessage('Player 1, roll the dice to start!');
  }, []);
  
  const requestPointerLock = useCallback(() => {
    if (mode === 3 && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  }, [mode]);
  
  // Player selection screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-slate-700 rounded-xl p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-white text-center mb-8">🎲 Snake & Ladder</h1>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">Select Number of Players</h2>
            <div className="flex justify-center gap-4">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setNumPlayers(num)}
                  className={`w-16 h-16 rounded-xl font-bold text-2xl transition ${
                    numPlayers === num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-400'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">Players</h2>
            <div className="flex justify-center gap-3 flex-wrap">
              {Array.from({ length: numPlayers }).map((_, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 bg-slate-600 px-3 py-2 rounded-lg"
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: PLAYER_COLORS[i] }}
                  />
                  <span className="text-white text-sm">{PLAYER_NAMES[i]}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition"
          >
            Start Game
          </button>
          
          <Link 
            href="/" 
            className="block text-center text-slate-400 hover:text-blue-400 mt-4 transition"
          >
            ← Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }
  
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
                <Board2D 
                  playerPositions={playerPositions} 
                  currentPlayerIndex={currentPlayerIndex}
                  targetPosition={targetPosition}
                  numPlayers={numPlayers}
                />
              </div>
            ) : (
              <div 
                ref={canvasRef}
                onClick={requestPointerLock}
                className="bg-slate-700 rounded-xl overflow-hidden"
                style={{ height: '600px' }}
              >
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white">Loading 3D Engine...</div>}>
                  <Canvas shadows>
                    <Scene 
                      playerPositions={playerPositions} 
                      currentPlayerIndex={currentPlayerIndex}
                      numPlayers={numPlayers}
                      mode={mode} 
                    />
                  </Canvas>
                </Suspense>
              </div>
            )}
          </div>
          
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700 rounded-xl p-6 space-y-6">
              {/* Current Player Indicator */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-2">Current Turn</h2>
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{ backgroundColor: PLAYER_COLORS[currentPlayerIndex] + '40' }}
                >
                  <div 
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: PLAYER_COLORS[currentPlayerIndex] }}
                  />
                  <span className="text-white font-semibold">{PLAYER_NAMES[currentPlayerIndex]}</span>
                </div>
              </div>
              
              {/* Game Status */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-2">Game Status</h2>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-300 text-sm">{gameMessage}</p>
                </div>
              </div>
              
              {/* Player Positions */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Player Positions</h2>
                <div className="space-y-2">
                  {Array.from({ length: numPlayers }).map((_, i) => (
                    <div 
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        i === currentPlayerIndex ? 'bg-slate-600 ring-2 ring-white' : 'bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: PLAYER_COLORS[i] }}
                        />
                        <span className="text-white text-sm">{PLAYER_NAMES[i]}</span>
                      </div>
                      <span className="text-blue-400 font-bold">{playerPositions[i]}</span>
                    </div>
                  ))}
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
                  disabled={rolling || winner !== null}
                  className={`
                    mt-4 w-full py-3 rounded-lg font-semibold transition
                    ${rolling || winner !== null
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    }
                  `}
                >
                  {winner !== null ? `🎉 ${PLAYER_NAMES[winner]} Won!` : rolling ? 'Rolling...' : 'Roll Dice'}
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
                  {Array.from({ length: numPlayers }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: PLAYER_COLORS[i] }}
                      />
                      <span className="text-slate-300">{PLAYER_NAMES[i]}</span>
                    </div>
                  ))}
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
      {winner !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
            <div className="flex justify-center items-center gap-2 mb-4">
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[winner] }}
              />
              <span className="text-xl text-white font-semibold">{PLAYER_NAMES[winner]}</span>
            </div>
            <p className="text-slate-300 mb-6">has reached position 100 and won the game!</p>
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

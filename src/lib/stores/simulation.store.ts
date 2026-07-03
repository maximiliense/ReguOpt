import { writable } from 'svelte/store';

interface Position {
  x: number;
  y: number;
}

interface MazeSnapshot {
  tick: number;
  agentPos: Position;
  goalPos: Position;
  walls: boolean[][];
  beliefs: Float32Array;
  predictionErrors: Float32Array;
  expectedFE: Record<string, number>;
  chosenAction: 'up' | 'down' | 'left' | 'right' | 'stay';
  totalFE: number;
  epistemicValue: number;
  pragmaticValue: number;
}

interface SimulationState {
  running: boolean;
  speed: number;
  snapshot: MazeSnapshot | null;
  history: MazeSnapshot[];
  wasmReady: boolean;
}

const defaultState: SimulationState = {
  running: false,
  speed: 1,
  snapshot: null,
  history: [],
  wasmReady: false
};

export const simulation = writable<SimulationState>(defaultState);

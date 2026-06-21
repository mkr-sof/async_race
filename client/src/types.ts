export type Car = {
  id: number;
  name: string;
  color: string;
};

export type CarDraft = {
  name: string;
  color: string;
};

export type EngineStatus = 'started' | 'stopped' | 'drive';

export type EngineStart = {
  velocity: number;
  distance: number;
};

export type Winner = {
  id: number;
  wins: number;
  time: number;
};

export type WinnerRow = Winner & {
  car: Car | null;
};

export type SortField = 'wins' | 'time';

export type SortOrder = 'ASC' | 'DESC';

export type PageResult<T> = {
  items: T[];
  total: number;
};

export type RaceStatus = 'idle' | 'starting' | 'driving' | 'finished' | 'broken';

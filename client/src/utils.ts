import { CAR_BRANDS, CAR_MODELS, MAX_CAR_NAME_LENGTH, MIN_CAR_NAME_LENGTH, SECOND_IN_MS } from './constants';
import type { Car, CarDraft, EngineStart, Winner } from './types';

export function isValidCarName(name: string): boolean {
  const length = name.trim().length;
  return length >= MIN_CAR_NAME_LENGTH && length <= MAX_CAR_NAME_LENGTH;
}

export function normalizeCarDraft(draft: CarDraft): CarDraft {
  return { name: draft.name.trim(), color: draft.color };
}

export function randomCar(): CarDraft {
  const brand = CAR_BRANDS[Math.floor(Math.random() * CAR_BRANDS.length)];
  const model = CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)];
  const color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
  return { name: `${brand} ${model}`, color };
}

export function driveTime({ distance, velocity }: EngineStart): number {
  return distance / velocity;
}

export function seconds(ms: number): number {
  return Number((ms / SECOND_IN_MS).toFixed(2));
}

export function pages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

export function mergeWinner(existing: Winner | null, car: Car, time: number): Winner {
  if (!existing) return { id: car.id, wins: 1, time };
  return { id: car.id, wins: existing.wins + 1, time: Math.min(existing.time, time) };
}

import { API_BASE_URL } from './constants';
import type { Car, CarDraft, EngineStart, EngineStatus, PageResult, SortField, SortOrder, Winner } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

function totalFrom(response: Response, fallback: number): number {
  return Number(response.headers.get('X-Total-Count') ?? fallback);
}

export async function getCars(page: number, limit: number): Promise<PageResult<Car>> {
  const response = await fetch(`${API_BASE_URL}/garage?_page=${page}&_limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load cars');
  const items = (await response.json()) as Car[];
  return { items, total: totalFrom(response, items.length) };
}

export function getCar(id: number): Promise<Car> {
  return request<Car>(`/garage/${id}`);
}

export function createCar(car: CarDraft): Promise<Car> {
  return request<Car>('/garage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(car),
  });
}

export function updateCar(id: number, car: CarDraft): Promise<Car> {
  return request<Car>(`/garage/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(car),
  });
}

export function deleteCar(id: number): Promise<Record<string, never>> {
  return request<Record<string, never>>(`/garage/${id}`, { method: 'DELETE' });
}

export function switchEngine(id: number, status: EngineStatus): Promise<EngineStart> {
  return request<EngineStart>(`/engine?id=${id}&status=${status}`, { method: 'PATCH' });
}

export async function getWinners(
  page: number,
  limit: number,
  sort: SortField,
  order: SortOrder,
): Promise<PageResult<Winner>> {
  const url = `/winners?_page=${page}&_limit=${limit}&_sort=${sort}&_order=${order}`;
  const response = await fetch(`${API_BASE_URL}${url}`);
  if (!response.ok) throw new Error('Failed to load winners');
  const items = (await response.json()) as Winner[];
  return { items, total: totalFrom(response, items.length) };
}

export function getWinner(id: number): Promise<Winner> {
  return request<Winner>(`/winners/${id}`);
}

export function createWinner(winner: Winner): Promise<Winner> {
  return request<Winner>('/winners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(winner),
  });
}

export function updateWinner(winner: Winner): Promise<Winner> {
  return request<Winner>(`/winners/${winner.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wins: winner.wins, time: winner.time }),
  });
}

export async function deleteWinner(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/winners/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) throw new Error('Failed to delete winner');
}

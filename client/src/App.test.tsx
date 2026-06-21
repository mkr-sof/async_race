import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── utils ────────────────────────────────────────────────────────────────────
import {
  driveTime,
  isValidCarName,
  mergeWinner,
  normalizeCarDraft,
  pages,
  randomCar,
  seconds,
} from './utils';
import { CAR_BRANDS, CAR_MODELS } from './constants';
import type { Winner } from './types';

// ─── store ────────────────────────────────────────────────────────────────────
import { store } from './store';
import {
  clearSelectedCar,
  selectCar,
  setCars,
  setCreateForm,
  setEditForm,
  setGaragePage,
  setSorting,
  setWinners,
  setWinnersPage,
} from './store';

// ─── components ───────────────────────────────────────────────────────────────
import { Pagination } from './Pagination';
import { CarIcon } from './CarIcon';

// ==============================================================================
// utils
// ==============================================================================

describe('isValidCarName', () => {
  it('accepts normal names', () => {
    expect(isValidCarName('Tesla Model S')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidCarName('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidCarName('   ')).toBe(false);
  });

  it('rejects names exceeding 40 chars', () => {
    expect(isValidCarName('A'.repeat(41))).toBe(false);
  });

  it('accepts a name of exactly 40 chars', () => {
    expect(isValidCarName('A'.repeat(40))).toBe(true);
  });
});

describe('normalizeCarDraft', () => {
  it('trims whitespace from the name', () => {
    expect(normalizeCarDraft({ name: '  BMW  ', color: '#fff' })).toEqual({
      name: 'BMW',
      color: '#fff',
    });
  });

  it('preserves color as-is', () => {
    expect(normalizeCarDraft({ name: 'X', color: '#123456' }).color).toBe('#123456');
  });
});

describe('randomCar', () => {
  it('returns an object with name and color', () => {
    const car = randomCar();
    expect(typeof car.name).toBe('string');
    expect(typeof car.color).toBe('string');
  });

  it('name is composed of a known brand and model', () => {
    for (let i = 0; i < 20; i++) {
      const { name } = randomCar();
      const [brand, ...rest] = name.split(' ');
      const model = rest.join(' ');
      expect(CAR_BRANDS).toContain(brand);
      expect(CAR_MODELS).toContain(model);
    }
  });

  it('color is a valid hex string', () => {
    const { color } = randomCar();
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('driveTime', () => {
  it('calculates ms correctly', () => {
    expect(driveTime({ distance: 500000, velocity: 100 })).toBe(5000);
  });
});

describe('seconds', () => {
  it('converts ms to seconds rounded to 2dp', () => {
    expect(seconds(5000)).toBe(5);
    expect(seconds(1234)).toBe(1.23);
  });
});

describe('pages', () => {
  it('returns correct page count', () => {
    expect(pages(7, 7)).toBe(1);
    expect(pages(8, 7)).toBe(2);
    expect(pages(0, 7)).toBe(1);
    expect(pages(14, 7)).toBe(2);
  });
});

describe('mergeWinner', () => {
  const car = { id: 1, name: 'Tesla', color: '#fff' };

  it('creates a new winner entry when none exists', () => {
    const result = mergeWinner(null, car, 12.5);
    expect(result).toEqual({ id: 1, wins: 1, time: 12.5 });
  });

  it('increments wins and keeps best time', () => {
    const existing: Winner = { id: 1, wins: 3, time: 10 };
    expect(mergeWinner(existing, car, 11).wins).toBe(4);
    expect(mergeWinner(existing, car, 11).time).toBe(10); // keeps existing better time
    expect(mergeWinner(existing, car, 8).time).toBe(8);  // updates to new better time
  });
});

// ==============================================================================
// Redux store
// ==============================================================================

describe('Redux store', () => {
  beforeEach(() => {
    // Reset to a known state by re-dispatching initial setters
    store.dispatch(setGaragePage(1));
    store.dispatch(setWinnersPage(1));
    store.dispatch(clearSelectedCar());
  });

  it('setCars updates cars and total', () => {
    store.dispatch(setCars({ cars: [{ id: 1, name: 'BMW', color: '#fff' }], total: 1 }));
    expect(store.getState().race.cars).toHaveLength(1);
    expect(store.getState().race.carsTotal).toBe(1);
  });

  it('setWinners updates winners and total', () => {
    store.dispatch(setWinners({ winners: [{ id: 1, wins: 2, time: 9.5, car: null }], total: 1 }));
    expect(store.getState().race.winnersTotal).toBe(1);
  });

  it('setGaragePage clamps to minimum 1', () => {
    store.dispatch(setGaragePage(0));
    expect(store.getState().race.garagePage).toBe(1);
    store.dispatch(setGaragePage(-5));
    expect(store.getState().race.garagePage).toBe(1);
  });

  it('setWinnersPage clamps to minimum 1', () => {
    store.dispatch(setWinnersPage(0));
    expect(store.getState().race.winnersPage).toBe(1);
  });

  it('selectCar sets selectedCarId and prefills editForm', () => {
    store.dispatch(selectCar({ id: 42, name: 'Audi', color: '#aabbcc' }));
    const { selectedCarId, editForm } = store.getState().race;
    expect(selectedCarId).toBe(42);
    expect(editForm.name).toBe('Audi');
    expect(editForm.color).toBe('#aabbcc');
  });

  it('clearSelectedCar resets selectedCarId and editForm', () => {
    store.dispatch(selectCar({ id: 42, name: 'Audi', color: '#aabbcc' }));
    store.dispatch(clearSelectedCar());
    expect(store.getState().race.selectedCarId).toBeNull();
    expect(store.getState().race.editForm.name).toBe('');
  });

  it('setCreateForm merges partial updates', () => {
    store.dispatch(setCreateForm({ name: 'Porsche' }));
    expect(store.getState().race.createForm.name).toBe('Porsche');
    // color should remain unchanged
    expect(store.getState().race.createForm.color).toBeTruthy();
  });

  it('setEditForm merges partial updates', () => {
    store.dispatch(setEditForm({ color: '#112233' }));
    expect(store.getState().race.editForm.color).toBe('#112233');
  });

  it('setSorting toggles order when same field selected', () => {
    // default sortField is 'wins', order is 'DESC'
    store.dispatch(setSorting('wins'));
    expect(store.getState().race.sortOrder).toBe('ASC');
    store.dispatch(setSorting('wins'));
    expect(store.getState().race.sortOrder).toBe('DESC');
  });

  it('setSorting switches to new field with default order', () => {
    store.dispatch(setSorting('time'));
    expect(store.getState().race.sortField).toBe('time');
    expect(store.getState().race.sortOrder).toBe('ASC');
  });

  it('setSorting resets winnersPage to 1', () => {
    store.dispatch(setWinnersPage(3));
    store.dispatch(setSorting('wins'));
    expect(store.getState().race.winnersPage).toBe(1);
  });
});

// ==============================================================================
// Pagination component
// ==============================================================================

describe('Pagination', () => {
  const onPage = vi.fn();

  beforeEach(() => onPage.mockClear());

  it('renders current page and total', () => {
    render(<Pagination label="test" page={2} total={21} limit={7} onPage={onPage} />);
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();
  });

  it('Prev button is disabled on first page', () => {
    render(<Pagination label="test" page={1} total={14} limit={7} onPage={onPage} />);
    expect(screen.getByText('Prev')).toBeDisabled();
  });

  it('Next button is disabled on last page', () => {
    render(<Pagination label="test" page={2} total={14} limit={7} onPage={onPage} />);
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('calls onPage with decremented value on Prev click', async () => {
    render(<Pagination label="test" page={3} total={21} limit={7} onPage={onPage} />);
    await userEvent.click(screen.getByText('Prev'));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('calls onPage with incremented value on Next click', async () => {
    render(<Pagination label="test" page={1} total={21} limit={7} onPage={onPage} />);
    await userEvent.click(screen.getByText('Next'));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('both buttons disabled when disabled prop is true', () => {
    render(<Pagination label="test" page={2} total={21} limit={7} disabled onPage={onPage} />);
    expect(screen.getByText('Prev')).toBeDisabled();
    expect(screen.getByText('Next')).toBeDisabled();
  });
});

// ==============================================================================
// CarIcon component
// ==============================================================================

describe('CarIcon', () => {
  it('renders an SVG with the car color applied', () => {
    const { container } = render(<CarIcon car={{ color: '#ff0000', name: 'RedCar' }} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('aria-label')).toBe('RedCar');
    // The body path should carry the car's color
    const coloredPath = container.querySelector('path[fill="#ff0000"]');
    expect(coloredPath).toBeInTheDocument();
  });

  it('adds carIconSmall class when small=true', () => {
    const { container } = render(<CarIcon car={{ color: '#00f', name: 'Mini' }} small />);
    // SVG className is an SVGAnimatedString — use classList or baseVal
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('carIconSmall')).toBe(true);
  });
});

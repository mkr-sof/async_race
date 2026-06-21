import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Provider } from 'react-redux';
import {
  createBrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
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
  store,
} from './store';
import { useAppDispatch, useAppSelector } from './hooks';
import {
  createCar,
  createWinner,
  deleteCar,
  deleteWinner,
  getCar,
  getCars,
  getWinner,
  getWinners,
  switchEngine,
  updateCar,
  updateWinner,
} from './api';
import { CarIcon } from './CarIcon';
import { Pagination } from './Pagination';
import {
  GARAGE_PAGE_SIZE,
  MAX_CAR_NAME_LENGTH,
  RANDOM_CAR_COUNT,
  WINNERS_PAGE_SIZE,
} from './constants';
import type { Car, CarDraft, RaceStatus, SortField, Winner, WinnerRow } from './types';
import {
  driveTime,
  isValidCarName,
  mergeWinner,
  normalizeCarDraft,
  pages,
  randomCar,
  seconds,
} from './utils';
import './index.css';

type RaceItem = {
  status: RaceStatus;
  duration: number;
  progress: number;
};

type RaceMap = Record<number, RaceItem>;

const idleRaceItem: RaceItem = { status: 'idle', duration: 0, progress: 0 };

function Layout(): React.JSX.Element {
  const location = useLocation();

  return (
    <div className="shell">
      <header className="topBar">
        <div>
          <p className="eyebrow">Async Race Control</p>
          <h1>{location.pathname.includes('winners') ? 'Winners' : 'Garage'}</h1>
        </div>
        <nav className="tabs" aria-label="Main navigation">
          <NavLink to="/garage">Garage</NavLink>
          <NavLink to="/winners">Winners</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function CarForm({
  title,
  form,
  disabled,
  submitText,
  onChange,
  onSubmit,
}: {
  title: string;
  form: CarDraft;
  disabled?: boolean;
  submitText: string;
  onChange: (draft: Partial<CarDraft>) => void;
  onSubmit: () => void;
}): React.JSX.Element {
  const valid = isValidCarName(form.name);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (valid) onSubmit();
  }

  return (
    <form className="toolRow" onSubmit={handleSubmit}>
      <strong>{title}</strong>
      <input
        aria-label={`${title} name`}
        maxLength={MAX_CAR_NAME_LENGTH}
        placeholder="Car name"
        value={form.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <input
        aria-label={`${title} color`}
        type="color"
        value={form.color}
        onChange={(event) => onChange({ color: event.target.value })}
      />
      <button type="submit" disabled={disabled || !valid}>
        {submitText}
      </button>
    </form>
  );
}

function Garage(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const racePageToken = useRef(0);
  const race = useRef<RaceMap>({});
  const [raceState, setRaceState] = useState<RaceMap>({});
  const [winner, setWinner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const state = useAppSelector((root) => root.race);
  const selectedCar = state.cars.find((car) => car.id === state.selectedCarId) ?? null;
  const isRacing = Object.values(raceState).some((item) => item.status === 'driving' || item.status === 'starting');

  const loadCars = useCallback(async () => {
    const result = await getCars(state.garagePage, GARAGE_PAGE_SIZE);
    dispatch(setCars({ cars: result.items, total: result.total }));
  }, [dispatch, state.garagePage]);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  useEffect(() => {
    race.current = {};
    setRaceState({});
    setWinner(null);
    racePageToken.current += 1;
  }, [state.garagePage]);

  function updateRace(id: number, item: Partial<RaceItem>): void {
    race.current[id] = { ...(race.current[id] ?? idleRaceItem), ...item };
    setRaceState({ ...race.current });
  }

  async function saveWinner(car: Car, time: number): Promise<void> {
    let stored: Winner | null = null;
    try {
      stored = await getWinner(car.id);
    } catch {
      stored = null;
    }
    const next = mergeWinner(stored, car, time);
    if (stored) await updateWinner(next);
    else await createWinner(next);
  }

  async function startCar(car: Car, raceToken = racePageToken.current): Promise<Car | null> {
    updateRace(car.id, { status: 'starting', progress: 0 });
    const engine = await switchEngine(car.id, 'started');
    const duration = driveTime(engine);
    updateRace(car.id, { status: 'driving', duration, progress: 100 });
    try {
      await switchEngine(car.id, 'drive');
      if (raceToken !== racePageToken.current) return null;
      updateRace(car.id, { status: 'finished', progress: 100, duration });
      return car;
    } catch {
      updateRace(car.id, { status: 'broken', progress: 60 });
      return null;
    }
  }

  async function stopCar(car: Car): Promise<void> {
    await switchEngine(car.id, 'stopped');
    updateRace(car.id, { status: 'idle', progress: 0, duration: 0 });
  }

  async function startRace(): Promise<void> {
    setWinner(null);
    racePageToken.current += 1;
    const token = racePageToken.current;
    const starts = state.cars.map((car) => startCar(car, token));
    const finished = await Promise.race(starts.map((promise) => promise.then((car) => car).catch(() => null)));
    if (finished && token === racePageToken.current) {
      const time = seconds(race.current[finished.id]?.duration ?? 0);
      setWinner(`${finished.name} wins in ${time}s`);
      await saveWinner(finished, time);
    }
  }

  async function resetRace(): Promise<void> {
    racePageToken.current += 1;
    await Promise.allSettled(state.cars.map((car) => stopCar(car)));
    setWinner(null);
  }

  async function handleCreate(): Promise<void> {
    setBusy(true);
    await createCar(normalizeCarDraft(state.createForm));
    dispatch(setCreateForm({ name: '' }));
    await loadCars();
    setBusy(false);
  }

  async function handleUpdate(): Promise<void> {
    if (!selectedCar) return;
    setBusy(true);
    await updateCar(selectedCar.id, normalizeCarDraft(state.editForm));
    dispatch(clearSelectedCar());
    await loadCars();
    setBusy(false);
  }

  async function handleDelete(car: Car): Promise<void> {
    setBusy(true);
    await stopCar(car).catch(() => undefined);
    await deleteCar(car.id);
    await deleteWinner(car.id);
    const lastPage = pages(state.carsTotal - 1, GARAGE_PAGE_SIZE);
    if (state.garagePage > lastPage) dispatch(setGaragePage(lastPage));
    else await loadCars();
    setBusy(false);
  }

  async function createRandomCars(): Promise<void> {
    setBusy(true);
    await Promise.all(Array.from({ length: RANDOM_CAR_COUNT }, () => createCar(randomCar())));
    await loadCars();
    setBusy(false);
  }

  return (
    <main>
      <section className="panel controls">
        <CarForm title="Create" form={state.createForm} disabled={busy} submitText="Create" onChange={(draft) => dispatch(setCreateForm(draft))} onSubmit={() => void handleCreate()} />
        <CarForm title="Edit" form={state.editForm} disabled={busy || !selectedCar} submitText="Update" onChange={(draft) => dispatch(setEditForm(draft))} onSubmit={() => void handleUpdate()} />
        <div className="raceControls">
          <button type="button" disabled={isRacing || !state.cars.length} onClick={() => void startRace()}>Race</button>
          <button type="button" disabled={!state.cars.length} onClick={() => void resetRace()}>Reset</button>
          <button type="button" disabled={busy || isRacing} onClick={() => void createRandomCars()}>Generate 100</button>
        </div>
      </section>

      {winner ? <div className="winnerBanner">{winner}</div> : null}

      <section className="sectionHead">
        <h2>Garage ({state.carsTotal})</h2>
        <Pagination label="Garage pages" disabled={isRacing} page={state.garagePage} total={state.carsTotal} limit={GARAGE_PAGE_SIZE} onPage={(page) => dispatch(setGaragePage(page))} />
      </section>

      <section className="garageList">
        {state.cars.length ? state.cars.map((car) => (
          <CarRow
            key={car.id}
            car={car}
            race={raceState[car.id] ?? idleRaceItem}
            busy={busy}
            onStart={() => void startCar(car)}
            onStop={() => void stopCar(car)}
            onSelect={() => dispatch(selectCar(car))}
            onDelete={() => void handleDelete(car)}
          />
        )) : <p className="empty">No Cars</p>}
      </section>
    </main>
  );
}

function CarRow({
  car,
  race: raceItem,
  busy,
  onStart,
  onStop,
  onSelect,
  onDelete,
}: {
  car: Car;
  race: RaceItem;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onSelect: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const running = raceItem.status === 'starting' || raceItem.status === 'driving';
  const destination = raceItem.progress ? 'calc(100% - 178px)' : '8px';
  const broken = raceItem.status === 'broken' ? '52%' : destination;
  const style = { '--drive-left': broken, '--drive-time': `${raceItem.duration}ms` } as CSSProperties;

  return (
    <article className="carRow">
      <div className="carMeta">
        <button type="button" disabled={running} onClick={onStart}>A</button>
        <button type="button" disabled={raceItem.status === 'idle'} onClick={onStop}>B</button>
        <button type="button" disabled={busy || running} onClick={onSelect}>Select</button>
        <button type="button" disabled={busy || running} onClick={onDelete}>Delete</button>
        <strong>{car.name}</strong>
      </div>
      <div className={`track ${raceItem.status}`} style={style}>
        <div className="carMover"><CarIcon car={car} /></div>
        <span className="finish">FINISH</span>
      </div>
    </article>
  );
}

function Winners(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { winners, winnersTotal, winnersPage, sortField, sortOrder } = useAppSelector((root) => root.race);

  const loadWinners = useCallback(async () => {
    const result = await getWinners(winnersPage, WINNERS_PAGE_SIZE, sortField, sortOrder);
    const rows = await Promise.all(result.items.map(winnerToRow));
    dispatch(setWinners({ winners: rows, total: result.total }));
  }, [dispatch, sortField, sortOrder, winnersPage]);

  useEffect(() => {
    void loadWinners();
  }, [loadWinners]);

  function sortLabel(field: SortField): string {
    if (sortField !== field) return '';
    return sortOrder === 'ASC' ? ' ↑' : ' ↓';
  }

  return (
    <main>
      <section className="sectionHead">
        <h2>Winners ({winnersTotal})</h2>
        <Pagination label="Winners pages" page={winnersPage} total={winnersTotal} limit={WINNERS_PAGE_SIZE} onPage={(page) => dispatch(setWinnersPage(page))} />
      </section>
      <table className="winnersTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Car</th>
            <th>Name</th>
            <th><button type="button" onClick={() => dispatch(setSorting('wins'))}>Wins{sortLabel('wins')}</button></th>
            <th><button type="button" onClick={() => dispatch(setSorting('time'))}>Best time{sortLabel('time')}</button></th>
          </tr>
        </thead>
        <tbody>
          {winners.map((winnerRow, index) => (
            <tr key={winnerRow.id}>
              <td>{(winnersPage - 1) * WINNERS_PAGE_SIZE + index + 1}</td>
              <td>{winnerRow.car ? <CarIcon car={winnerRow.car} small /> : 'Deleted'}</td>
              <td>{winnerRow.car?.name ?? 'Deleted car'}</td>
              <td>{winnerRow.wins}</td>
              <td>{winnerRow.time.toFixed(2)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!winners.length ? <p className="empty">No winners yet</p> : null}
    </main>
  );
}

async function winnerToRow(winner: Winner): Promise<WinnerRow> {
  try {
    return { ...winner, car: await getCar(winner.id) };
  } catch {
    return { ...winner, car: null };
  }
}

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to="/garage" replace /> },
        { path: 'garage', element: <Garage /> },
        { path: 'winners', element: <Winners /> },
        { path: '*', element: <Navigate to="/garage" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);

export default function App(): React.JSX.Element {
  const routerInstance = useMemo(() => router, []);
  return (
    <Provider store={store}>
      <RouterProvider router={routerInstance} />
    </Provider>
  );
}

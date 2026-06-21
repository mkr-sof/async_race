import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Car, SortField, SortOrder, WinnerRow } from './types';

type FormState = {
  name: string;
  color: string;
};

type AppState = {
  cars: Car[];
  carsTotal: number;
  winners: WinnerRow[];
  winnersTotal: number;
  garagePage: number;
  winnersPage: number;
  selectedCarId: number | null;
  createForm: FormState;
  editForm: FormState;
  sortField: SortField;
  sortOrder: SortOrder;
};

const defaultForm: FormState = { name: '', color: '#ff4d4f' };

const initialState: AppState = {
  cars: [],
  carsTotal: 0,
  winners: [],
  winnersTotal: 0,
  garagePage: 1,
  winnersPage: 1,
  selectedCarId: null,
  createForm: defaultForm,
  editForm: { name: '', color: '#1677ff' },
  sortField: 'wins',
  sortOrder: 'DESC',
};

const appSlice = createSlice({
  name: 'race',
  initialState,
  reducers: {
    setCars(state, action: PayloadAction<{ cars: Car[]; total: number }>) {
      state.cars = action.payload.cars;
      state.carsTotal = action.payload.total;
    },
    setWinners(state, action: PayloadAction<{ winners: WinnerRow[]; total: number }>) {
      state.winners = action.payload.winners;
      state.winnersTotal = action.payload.total;
    },
    setGaragePage(state, action: PayloadAction<number>) {
      state.garagePage = Math.max(1, action.payload);
    },
    setWinnersPage(state, action: PayloadAction<number>) {
      state.winnersPage = Math.max(1, action.payload);
    },
    setCreateForm(state, action: PayloadAction<Partial<FormState>>) {
      state.createForm = { ...state.createForm, ...action.payload };
    },
    selectCar(state, action: PayloadAction<Car>) {
      state.selectedCarId = action.payload.id;
      state.editForm = { name: action.payload.name, color: action.payload.color };
    },
    clearSelectedCar(state) {
      state.selectedCarId = null;
      state.editForm = { name: '', color: '#1677ff' };
    },
    setEditForm(state, action: PayloadAction<Partial<FormState>>) {
      state.editForm = { ...state.editForm, ...action.payload };
    },
    setSorting(state, action: PayloadAction<SortField>) {
      if (state.sortField === action.payload) {
        state.sortOrder = state.sortOrder === 'ASC' ? 'DESC' : 'ASC';
      } else {
        state.sortField = action.payload;
        state.sortOrder = action.payload === 'wins' ? 'DESC' : 'ASC';
      }
      state.winnersPage = 1;
    },
  },
});

export const {
  clearSelectedCar,
  selectCar,
  setCars,
  setCreateForm,
  setEditForm,
  setGaragePage,
  setSorting,
  setWinners,
  setWinnersPage,
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    race: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import React from 'react';
import type { Car } from './types';

type Props = {
  car: Pick<Car, 'color' | 'name'>;
  small?: boolean;
};

export function CarIcon({ car, small = false }: Props): React.JSX.Element {
  const label = small ? `${car.name} icon` : car.name;
  return (
    <svg className={small ? 'carIcon carIconSmall' : 'carIcon'} viewBox="0 0 120 52" role="img" aria-label={label}>
      <path
        d="M16 34h8l10-15c3-5 8-8 14-8h27c6 0 11 3 15 8l10 15h7c5 0 9 4 9 9v2H7v-2c0-5 4-9 9-9Z"
        fill={car.color}
      />
      <path d="M40 18h19v16H29l7-11c1-3 2-5 4-5ZM66 18h10c4 0 7 2 10 5l8 11H66V18Z" fill="#f7fbff" />
      <path d="M7 42h109v5H7z" fill="#242936" opacity="0.2" />
      <circle cx="33" cy="43" r="8" fill="#202430" />
      <circle cx="33" cy="43" r="4" fill="#f7fbff" />
      <circle cx="91" cy="43" r="8" fill="#202430" />
      <circle cx="91" cy="43" r="4" fill="#f7fbff" />
    </svg>
  );
}

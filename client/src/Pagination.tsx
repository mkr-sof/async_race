import React from 'react';
import { pages } from './utils';

type Props = {
  label: string;
  page: number;
  total: number;
  limit: number;
  disabled?: boolean;
  onPage: (page: number) => void;
};

export function Pagination({ label, page, total, limit, disabled = false, onPage }: Props): React.JSX.Element {
  const last = pages(total, limit);
  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span>
        Page {page} / {last}
      </span>
      <button type="button" disabled={disabled || page >= last} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}

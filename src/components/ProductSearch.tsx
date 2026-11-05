import { useState } from 'react';
import type { Product } from '../types/product';

type Props = {
  value: string;
  matches: Product[];
  onChange: (value: string) => void;
};

export default function ProductSearch({ value, matches, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const suggestions = matches.slice(0, 5);
  const expanded = open && value.trim() !== '' && suggestions.length > 0;
  const active = expanded ? suggestions[index] : undefined;
  const listId = 'product-suggestions';

  function close() {
    setOpen(false);
    setIndex(-1);
  }

  function select(product: Product) {
    onChange(product.name);
    close();
  }

  return (
    <div className="search-field">
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={active ? listId + '-' + index : undefined}
        placeholder="Try keyboard or headphones"
        value={value}
        onBlur={close}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape' && expanded) {
            event.preventDefault();
            close();
          } else if (event.key === 'Enter' && active) {
            event.preventDefault();
            select(active);
          } else if (
            (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
            value.trim() && suggestions.length > 0
          ) {
            event.preventDefault();
            setOpen(true);
            const last = suggestions.length - 1;
            setIndex(event.key === 'ArrowDown'
              ? Math.min(index + 1, last)
              : index < 0 ? last : Math.max(index - 1, 0));
          }
        }}
      />
      <ul id={listId} role="listbox" aria-label="Product suggestions"
        className="product-suggestions" hidden={!expanded}>
        {suggestions.map((product, position) => (
          <li key={product.id} id={listId + '-' + position}
            role="option" aria-selected={active?.id === product.id}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => select(product)}>
            {product.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

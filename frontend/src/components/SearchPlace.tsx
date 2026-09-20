import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/services/api";
import { TextField } from "@/ui/Field";
import s from "./SearchPlace.module.css";
export type SearchLocation = {
  label: string;
  latitude: number;
  longitude: number;
};
export function validCoordinates(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  if (
    latitude == null ||
    longitude == null ||
    String(latitude).trim() === "" ||
    String(longitude).trim() === ""
  )
    return null;
  const lat = Number(latitude),
    lon = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
    ? { latitude: lat, longitude: lon }
    : null;
}
export function SearchPlace({
  value,
  selected,
  home,
  onChange,
}: {
  value: string;
  selected: boolean;
  home: SearchLocation | null;
  onChange: (value: string, location: SearchLocation | null) => void;
}) {
  const id = useId(),
    request = useRef<AbortController | null>(null);
  const [items, setItems] = useState<SearchLocation[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [searched, setSearched] = useState(false),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    request.current?.abort();
    setItems([]);
    setActive(-1);
    setError("");
    setSearched(false);
    setBusy(false);
    if (
      selected ||
      value.trim().length < 3 ||
      (/^\d+$/.test(value.trim()) && value.trim().length < 5)
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const result = await api<{ items: SearchLocation[] }>(
          "/listings/locations?q=" + encodeURIComponent(value.trim()),
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setItems(
            result.items.filter(
              (item) =>
                typeof item.label === "string" &&
                !!validCoordinates(item.latitude, item.longitude),
            ),
          );
          setSearched(true);
        }
      } catch {
        if (!controller.signal.aborted)
          setError("Recherche de lieux indisponible.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, selected, retry]);
  function choose(item: SearchLocation) {
    request.current?.abort();
    setOpen(false);
    setItems([]);
    onChange(item.label, item);
  }
  return (
    <div
      className={s.place}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <TextField
        label="Où ?"
        value={value}
        placeholder={home ? home.label : "Ville, code postal ou adresse"}
        maxLength={150}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
        aria-controls={id}
        aria-activedescendant={
          open && active >= 0 ? `${id}-${active}` : undefined
        }
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          request.current?.abort();
          setItems([]);
          setActive(-1);
          setOpen(true);
          onChange(e.target.value, null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) =>
              e.key === "ArrowDown"
                ? (a + 1) % items.length
                : (a <= 0 ? items.length : a) - 1,
            );
          }
          if (e.key === "Enter" && open && active >= 0 && items[active]) {
            e.preventDefault();
            choose(items[active]);
          }
        }}
      />
      {open && items.length > 0 && (
        <ul
          id={id}
          role="listbox"
          aria-label="Lieux proposés"
          className={s.results}
        >
          {items.map((item, index) => (
            <li
              key={`${item.latitude}-${item.longitude}-${index}`}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(item)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
      {(busy || error || (searched && !items.length && !selected)) && (
        <p className={s.status} role="status">
          {busy ? (
            "Recherche…"
          ) : error ? (
            <>
              {error}{" "}
              <button type="button" onClick={() => setRetry((n) => n + 1)}>
                Réessayer
              </button>
            </>
          ) : (
            "Aucun lieu trouvé. Précisez votre saisie."
          )}
        </p>
      )}
      {home && value && (
        <button type="button" className={s.home} onClick={() => choose(home)}>
          Utiliser ma zone enregistrée
        </button>
      )}
    </div>
  );
}

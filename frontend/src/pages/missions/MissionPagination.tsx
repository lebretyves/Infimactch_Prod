import { Button } from "@/ui/Button";
import { pageNumbers } from "./searchModel";
import s from "../Missions.module.css";

const number = (v: number) => v.toLocaleString("fr-FR");
type Props = {
  currentPage: number;
  lastPage: number;
  update: (values: Record<string, string | number>) => void;
};

export function MissionPagination({ currentPage, lastPage, update }: Props) {
  return (
    <nav className={s.pagination} aria-label="Pagination des offres">
      <Button
        variant="outline"
        disabled={currentPage === 1}
        onClick={() => update({ page: currentPage - 1 })}
      >
        Précédent
      </Button>
      <div className={s.numbers}>
        {pageNumbers(currentPage, lastPage).map((v) =>
          typeof v === "number" ? (
            <button
              key={v}
              type="button"
              aria-label={"Page " + v}
              aria-current={v === currentPage ? "page" : undefined}
              onClick={() => update({ page: v })}
            >
              {number(v)}
            </button>
          ) : (
            <span key={v}>…</span>
          ),
        )}
      </div>
      <Button
        variant="outline"
        disabled={currentPage === lastPage}
        onClick={() => update({ page: currentPage + 1 })}
      >
        Suivant
      </Button>
    </nav>
  );
}

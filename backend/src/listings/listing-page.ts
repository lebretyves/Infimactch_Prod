/** One database snapshot for the filtered count and the requested page, including empty pages. */
export function listingPageQuery(
  sourceSql: string,
  sourceParameters: unknown[],
  page: { limit?: number; offset?: number; q?: string; origine?: string },
) {
  const parameters = [...sourceParameters];
  const bind = (value: unknown) => {
    parameters.push(value);
    return "$" + parameters.length;
  };
  const query = page.q?.trim();
  // strpos treats %, _ and backslashes literally; user text is always a bound parameter.
  const filter = query
    ? " WHERE strpos(lower(concat_ws(' ',data->>'title',data->>'service',data->>'location_label',data->>'address')),lower(" + bind(query) + "::text))>0"
    : "";
  const order = page.origine !== undefined ? "CASE WHEN data->>'kind'='INTERNAL_MISSION' THEN 0 ELSE 1 END,listed_at DESC,listing_id" : "listed_at DESC,listing_id";
  const sql = "WITH filtered AS (SELECT * FROM (" + sourceSql + ") available" + filter +
    "), paged AS (SELECT * FROM filtered ORDER BY " + order + " LIMIT " + bind(page.limit ?? 20) +
    " OFFSET " + bind(page.offset ?? 0) +
    ") SELECT (SELECT count(*)::int FROM filtered) AS total,COALESCE((SELECT jsonb_agg(data ORDER BY " + order + ") FROM paged),'[]'::jsonb) AS items";
  return { sql, parameters };
}

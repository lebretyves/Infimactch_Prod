/** Internal SQL expressions only. Keep the fields consumed by partialOfferMatch.
 * Provider payloads and descriptions are hydrated after ranking. */
export function externalRankingProvenanceSql(provenance: string): string {
  const field = (path: string) => `(${provenance})#>'{${path}}'`;
  return `jsonb_build_object(
    'publishedAt',${field('publishedAt')},
    'facts',jsonb_build_object(
      'qualification',${field('facts,qualification')},
      'warnings',${field('facts,warnings')},
      'workingTime',${field('facts,workingTime')},
      'experience',jsonb_build_object('label',${field('facts,experience,label')}),
      'location',jsonb_build_object('coordinates',${field('facts,location,coordinates')})
    ))`;
}

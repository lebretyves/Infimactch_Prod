export type SearchArea = {place:string;lat:string;lon:string;radius:string};
export const validRadius = (v:string) => v === '' || (Number.isFinite(Number(v)) && Number(v)>=0.1 && Number(v)<=1000);
const key=(id:string)=>'infimatch:search-area:v1:'+id;
export function readSearchArea(id:string):SearchArea|null {
 try {
  const a=JSON.parse(localStorage.getItem(key(id)) || 'null');
  if(!a || !['place','lat','lon','radius'].every(k=>typeof a[k]==='string') || a.place.length>150 || !validRadius(a.radius))return null;
  if(!a.place && !a.lat && !a.lon && !a.radius)return a;
  if(!a.lat.trim() || !a.lon.trim() || !Number.isFinite(Number(a.lat)) || !Number.isFinite(Number(a.lon)) || Math.abs(Number(a.lat))>90 || Math.abs(Number(a.lon))>180)return null;
  return a;
 } catch {return null;}
}
export function saveSearchArea(id:string, area:SearchArea) {
 try {localStorage.setItem(key(id),JSON.stringify(area));}catch { /* Storage is optional. */ }
}

// A saved account area takes precedence over the residence proposal, never over a local search.
export function profileSearchArea(profile: {latitude: number | null; longitude: number | null; radius_km: number | null; details?: {mobilityCity?: string}}): SearchArea | null {
 const {latitude, longitude, radius_km} = profile;
 if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180 || radius_km == null || !validRadius(String(radius_km))) return null;
 return {place: profile.details?.mobilityCity?.trim() || 'Ma zone enregistrée', lat:String(latitude), lon:String(longitude), radius:String(radius_km)};
}

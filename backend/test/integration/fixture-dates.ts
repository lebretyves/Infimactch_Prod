// Keep valid scenario dates inside the API two-year programming horizon.
// Deliberately invalid/past dates in security tests must not use this helper.
export const fixtureDate=(value:string)=>value.replace(/^203\d/,String(new Date().getUTCFullYear()+1));

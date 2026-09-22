export const normalizeFiness = (value: string) =>
  value.replace(/\s/g, "").toUpperCase();
export const isCompleteFiness = (value: string) =>
  /^(?:[0-9]{9}|2[AB][0-9]{7})$/.test(normalizeFiness(value));

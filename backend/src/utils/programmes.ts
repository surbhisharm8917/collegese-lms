export const PROGRAMME_LIST = [
  "Class 11",
  "Class 12",
  "CA Foundation",
  "CA Intermediate",
  "CA Final",
  "CSEET",
  "CS Executive",
  "CS Professional",
  "CMA Foundation",
  "CMA Intermediate",
  "CMA Final",
] as const;

export type ProgrammeName = (typeof PROGRAMME_LIST)[number];

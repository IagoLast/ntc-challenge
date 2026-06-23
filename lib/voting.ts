import type { VotePoint } from "./types";

export const VOTER_COOKIE = "ntc_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export const VOTE_SLOTS: {
  field: string;
  points: VotePoint;
  label: string;
  title: string;
}[] = [
  { field: "plus3", points: 3, label: "+3", title: "Mejor intento" },
  { field: "plus2", points: 2, label: "+2", title: "Segundo" },
  { field: "plus1", points: 1, label: "+1", title: "Tercero" },
  { field: "minus1", points: -1, label: "-1", title: "Castigo" },
];

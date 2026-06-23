export type Participant = {
  id: number;
  name: string;
  image_url: string | null;
  created_at: string;
};

export type Challenge = {
  id: number;
  week_number: number;
  title: string;
  description: string | null;
  created_at: string;
};

export type Trick = {
  id: number;
  challenge_id: number;
  name: string;
  description: string | null;
  created_at: string;
};

export type Submission = {
  id: number;
  trick_id: number;
  participant_id: number;
  video_url: string;
  created_at: string;
};

// Tipos enriquecidos para las vistas.
export type SubmissionWithParticipant = Submission & {
  participant_name: string;
  participant_image: string | null;
};

export type TrickWithSubmissions = Trick & {
  submissions: SubmissionWithParticipant[];
};

export type ChallengeWithTricks = Challenge & {
  tricks: TrickWithSubmissions[];
};

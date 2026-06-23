export type Participant = {
  id: number;
  name: string;
  image_url: string | null;
  vote_token: string | null;
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
  vote_score: number;
};

export type TrickWithSubmissions = Trick & {
  submissions: SubmissionWithParticipant[];
};

export type ChallengeWithTricks = Challenge & {
  tricks: TrickWithSubmissions[];
};

export type ParticipantScore = Participant & {
  video_count: number;
  vote_score: number;
  positive_points: number;
  negative_points: number;
};

export type VotePoint = 3 | 2 | 1 | -1;

export type VotingTarget = {
  participant_id: number;
  participant_name: string;
  participant_image: string | null;
};

export type CurrentVote = {
  points: VotePoint;
  target_participant_id: number;
};

export type TrickForVoting = Trick & {
  submissions: SubmissionWithParticipant[];
  targets: VotingTarget[];
  current_votes: CurrentVote[];
};

export type ChallengeForVoting = Challenge & {
  tricks: TrickForVoting[];
};

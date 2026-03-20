export interface DrawDto {
  id: string;
  drawDate: string;
  dayOfWeek: string;
  numbers: number[];
  jackpotAmount: number | null;
  winnersCount: number | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface FrequencyDto {
  number: number;
  count: number;
  percentage: number;
}

export interface HotColdDto {
  hotNumbers: NumberScore[];
  coldNumbers: NumberScore[];
  period: number;
}

export interface NumberScore {
  number: number;
  count: number;
  zScore: number;
}

export interface GapDto {
  number: number;
  currentGap: number;
  averageGap: number;
}

export interface PatternDto {
  oddEvenDistributions: { pattern: string; count: number; percentage: number }[];
  sumRangeDistributions: { range: string; count: number; percentage: number }[];
  decadeDistributions: { decade: string; averageCount: number }[];
}

export interface DashboardStatsDto {
  totalDraws: number;
  mostFrequentNumber: number;
  mostFrequentCount: number;
  lastJackpot: number | null;
  lastDrawDate: string | null;
  daysSinceLastDraw: number;
}

export interface PredictionResponse {
  numbers: number[];
  confidenceScore: number;
  strategy: string;
  reasoning: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  role: string;
}

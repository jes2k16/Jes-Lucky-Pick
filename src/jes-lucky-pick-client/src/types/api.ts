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

export interface PredictionMatchInfo {
  drawDate: string;
  drawNumbers: number[];
  matchedCount: number;
  matchPercentage: number;
}

export interface PredictionHistoryItem {
  id: string;
  numbers: number[];
  confidenceScore: number;
  strategy: string;
  reasoning: string;
  createdAt: string;
  matchInfo: PredictionMatchInfo | null;
}

export interface LastDrawInfoDto {
  drawDate: string;
  numbers: number[];
  jackpotAmount: number | null;
  winnersCount: number | null;
}

export interface GameScheduleDto {
  drawDays: string;
}

export interface DrawContextDto {
  lastDraw: LastDrawInfoDto | null;
  schedule: GameScheduleDto;
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
  profilePictureBase64: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  bio: string | null;
}

export interface ProfileResponse {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  bio: string | null;
  profilePictureBase64: string | null;
}

export interface UpdateProfileRequest {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  bio: string | null;
}

export interface AiSettingsResponse {
  isEnabled: boolean;
  model: string;
}

export interface UpdateAiSettingsRequest {
  isEnabled?: boolean;
  model?: string;
}

export interface AiModelOption {
  id: string;
  displayName: string;
}

export interface AiTestResult {
  success: boolean;
  message: string;
}

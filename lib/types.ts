export interface Catch {
  id: string;
  user_id: string | null;
  photo_url: string | null;
  species: string;
  size_cm: number | null;
  quantity: number | null;
  rig: string | null;
  caught_at: string;
  point: string | null;
  region: string | null;
  memo: string | null;
  created_at: string;
}

export interface AppSettings {
  id: string;
  selected_region: string;
  wind_unit: string | null;
  notif_tide: boolean | null;
  notif_community: boolean | null;
  updated_at: string;
}

export interface TideInfo {
  time: string;
  height: number;
  type: '만조' | '간조';
}

export interface WeatherInfo {
  windSpeed: number;
  waveHeight: number;
  waterTemp: number;
  airTemp: number;
  sky: string;
  windDir: string;
  windDirKr: string;
  windDirAngle: number;
  updatedAt: string;
}

export interface WeatherAlert {
  id: string;
  region: string;
  alertType: string;
  level: string;
  message: string;
  issuedAt: string;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

export interface Region {
  name: string;
  lat: number;
  lon: number;
  description: string;
  tideStation: string;
  gridX: number;
  gridY: number;
}

export interface FishingPoint {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  description: string | null;
  fish_types: string | null;
  point_type: string | null;
  created_at: string;
}

export interface FavoritePoint {
  id: string;
  point_id: string;
  point_name: string;
  created_at: string;
}

export interface PointPost {
  id: string;
  point_id: string;
  user_id: string | null;
  author_name: string;
  title: string;
  content: string | null;
  photo_url: string | null;
  is_blind: boolean | null;
  created_at: string;
}

export interface PointComment {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  is_blind: boolean | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  is_banned: boolean | null;
  is_admin: boolean | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  email: string | null;
  content: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: 'community' | 'weather';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

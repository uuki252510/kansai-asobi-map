export type IndoorType = "indoor" | "outdoor" | "both"
export type PriceType = "free" | "paid" | "mixed"
export type TargetAge = "0-2" | "3-5" | "6-12"
export type Prefecture = "大阪府" | "兵庫県" | "京都府" | "奈良県" | "滋賀県" | "和歌山県"
export type MoodTag =
  | "relax"
  | "active"
  | "kids"
  | "food"
  | "healing"
  | "photo"
  | "rain"
  | "discovery"
  | "shopping"
export type CompanionType = "solo" | "couple" | "friends" | "family" | "children" | "multigenerational"
export type RecommendedWeather = "sunny" | "cloudy" | "rainy" | "any"
export type RecommendedSeason = "spring" | "summer" | "autumn" | "winter" | "any"
export type RecommendedTimeOfDay = "morning" | "afternoon" | "evening" | "night" | "any"
export type CrowdLevel = "quiet" | "normal" | "busy" | "very_busy"

export type Place = {
  id: string
  name: string
  description: string | null
  /** どんなとこ？(Time Out型2ブロック。migration 20260805000002。未適用環境ではundefined) */
  what_is_it?: string | null
  /** なんで行くん？(同上) */
  why_go?: string | null
  /** 施設DB拡張列 (migration 20260805100000。未適用環境ではundefined) */
  slug?: string | null
  publication_status?: string
  catchphrase?: string | null
  short_description?: string | null
  seo_title?: string | null
  seo_description?: string | null
  phone_number?: string | null
  is_temporarily_closed?: boolean
  is_permanently_closed?: boolean
  is_featured?: boolean
  confirmation_method?: string | null
  confirmation_source_url?: string | null
  next_confirmation_due_at?: string | null
  reservation_type?: string | null
  minimum_visit_minutes?: number | null
  maximum_visit_minutes?: number | null
  noindex?: boolean
  prefecture: Prefecture
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  indoor_type: IndoorType
  target_ages: TargetAge[]
  price_type: PriceType
  price_note: string | null
  has_parking: boolean
  has_nursing_room: boolean
  has_diaper_space: boolean
  rainy_day_ok: boolean
  opening_hours: string | null
  image_url: string | null
  google_map_url: string | null
  website_url: string | null
  is_published: boolean
  mood_tags: MoodTag[]
  companion_types: CompanionType[]
  recommended_weather: RecommendedWeather[]
  recommended_seasons: RecommendedSeason[]
  recommended_time_of_day: RecommendedTimeOfDay[]
  average_stay_minutes: number | null
  activity_level: number | null
  healing_score: number | null
  child_fun_score: number | null
  date_score: number | null
  photo_score: number | null
  rainy_day_score: number | null
  crowd_level: CrowdLevel | null
  price_min: number | null
  price_max: number | null
  recommended_age_min: number | null
  recommended_age_max: number | null
  reservation_required: boolean | null
  same_day_booking: boolean | null
  stroller_accessible: boolean | null
  barrier_free: boolean | null
  pet_friendly: boolean | null
  meal_available: boolean | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export type Review = {
  id: string
  place_id: string
  rating: number
  comment: string | null
  user_name: string
  child_age: string | null
  visited_at: string | null
  image_url: string | null
  created_at: string
}

export type RecommendationLog = {
  id: string
  user_id: string | null
  session_id: string | null
  event_name: string
  conditions: Record<string, unknown>
  result_place_ids: string[]
  weather_snapshot: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type OutingHistory = {
  id: string
  user_id: string
  place_id: string
  visited_on: string
  companion_types: CompanionType[]
  note: string | null
  rating: number | null
  created_at: string
  updated_at: string
}

export type OutingPhoto = {
  id: string
  outing_id: string
  user_id: string
  storage_path: string
  caption: string | null
  created_at: string
  updated_at: string
}

export type FamilyMember = {
  id: string
  user_id: string
  display_name: string
  relationship: string | null
  birth_year: number | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ShareGroup = {
  id: string
  owner_user_id: string | null
  public_token: string
  title: string
  status: "open" | "closed"
  closes_at: string | null
  created_at: string
  updated_at: string
}

export type ShareGroupSpot = {
  id: string
  share_group_id: string
  place_id: string
  position: number
  created_at: string
  updated_at: string
}

export type Vote = {
  id: string
  share_group_id: string
  place_id: string
  voter_name: string
  voter_fingerprint: string
  comment: string | null
  created_at: string
  updated_at: string
}

export type UserPreference = {
  user_id: string
  companion_types: CompanionType[]
  mood_tags: MoodTag[]
  default_budget_max: number | null
  default_travel_minutes: number | null
  default_transport: string | null
  home_prefecture: string | null
  home_latitude: number | null
  home_longitude: number | null
  detail_preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type WeatherCache = {
  cache_key: string
  latitude: number
  longitude: number
  payload: Record<string, unknown>
  expires_at: string
  created_at: string
  updated_at: string
}

export type PlaceWithReviews = Place & {
  reviews: Review[]
  avg_rating?: number
}

type Insert<T, Generated extends keyof T> = Omit<T, Generated> & Partial<Pick<T, Generated>>

export type PlaceInsert = Insert<Place, "id" | "created_at" | "updated_at">
export type PlaceUpdate = Partial<PlaceInsert>
export type ReviewInsert = Omit<Review, "id" | "created_at">

export type Database = {
  public: {
    Tables: {
      places: { Row: Place; Insert: PlaceInsert; Update: PlaceUpdate; Relationships: [] }
      reviews: { Row: Review; Insert: ReviewInsert; Update: Partial<ReviewInsert>; Relationships: [] }
      recommendation_logs: {
        Row: RecommendationLog
        Insert: Insert<RecommendationLog, "id" | "created_at" | "updated_at" | "metadata" | "result_place_ids">
        Update: Partial<RecommendationLog>
      Relationships: []
      }
      outing_history: {
        Row: OutingHistory
        Insert: Insert<OutingHistory, "id" | "created_at" | "updated_at" | "visited_on" | "companion_types">
        Update: Partial<OutingHistory>
      Relationships: []
      }
      outing_photos: {
        Row: OutingPhoto
        Insert: Insert<OutingPhoto, "id" | "created_at" | "updated_at">
        Update: Partial<OutingPhoto>
      Relationships: []
      }
      family_members: {
        Row: FamilyMember
        Insert: Insert<FamilyMember, "id" | "created_at" | "updated_at" | "preferences">
        Update: Partial<FamilyMember>
      Relationships: []
      }
      share_groups: {
        Row: ShareGroup
        Insert: Insert<ShareGroup, "id" | "created_at" | "updated_at" | "public_token" | "title" | "status">
        Update: Partial<ShareGroup>
      Relationships: []
      }
      share_group_spots: {
        Row: ShareGroupSpot
        Insert: Insert<ShareGroupSpot, "id" | "created_at" | "updated_at">
        Update: Partial<ShareGroupSpot>
      Relationships: []
      }
      votes: {
        Row: Vote
        Insert: Insert<Vote, "id" | "created_at" | "updated_at">
        Update: Partial<Vote>
      Relationships: []
      }
      user_preferences: {
        Row: UserPreference
        Insert: Insert<UserPreference, "created_at" | "updated_at" | "companion_types" | "mood_tags" | "detail_preferences">
        Update: Partial<UserPreference>
      Relationships: []
      }
      weather_cache: {
        Row: WeatherCache
        Insert: Insert<WeatherCache, "created_at" | "updated_at">
        Update: Partial<WeatherCache>
      Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

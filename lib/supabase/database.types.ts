export type IndoorType = 'indoor' | 'outdoor' | 'both'
export type PriceType = 'free' | 'paid' | 'mixed'
export type TargetAge = '0-2' | '3-5' | '6-12'
export type Prefecture = '大阪府' | '兵庫県' | '京都府' | '奈良県' | '滋賀県' | '和歌山県'

export interface Place {
  id: string
  name: string
  description: string | null
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
  created_at: string
}

export interface Review {
  id: string
  place_id: string
  rating: number
  comment: string | null
  user_name: string
  child_age: string | null
  visited_at: string | null
  created_at: string
}

export interface PlaceWithReviews extends Place {
  reviews: Review[]
  avg_rating?: number
}

export type PlaceInsert = Omit<Place, 'id' | 'created_at'>
export type PlaceUpdate = Partial<PlaceInsert>
export type ReviewInsert = Omit<Review, 'id' | 'created_at'>

export type Database = {
  public: {
    Tables: {
      places: {
        Row: Place
        Insert: PlaceInsert
        Update: PlaceUpdate
      }
      reviews: {
        Row: Review
        Insert: ReviewInsert
        Update: Partial<ReviewInsert>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

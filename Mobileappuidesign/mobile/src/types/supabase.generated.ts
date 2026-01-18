export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          checkin_date: string
          checkin_reminder_sent_at: string | null
          checkout_date: string
          created_at: string
          currency: string
          deposit_amount: number
          deposit_nights: number
          deposit_paid: boolean
          discount_amount: number | null
          discount_percent: number | null
          guest_profile_id: string
          has_discount: boolean
          id: string
          listing_id: string
          nightly_price: number
          nights: number
          payment_scheme: string
          payment_status: string
          remaining_amount: number
          remaining_nights: number
          remaining_paid: boolean
          remaining_payment_status: string | null
          status: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          checkin_date: string
          checkin_reminder_sent_at?: string | null
          checkout_date: string
          created_at?: string
          currency?: string
          deposit_amount?: number
          deposit_nights?: number
          deposit_paid?: boolean
          discount_amount?: number | null
          discount_percent?: number | null
          guest_profile_id: string
          has_discount?: boolean
          id?: string
          listing_id: string
          nightly_price: number
          nights: number
          payment_scheme?: string
          payment_status?: string
          remaining_amount?: number
          remaining_nights?: number
          remaining_paid?: boolean
          remaining_payment_status?: string | null
          status?: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          checkin_date?: string
          checkin_reminder_sent_at?: string | null
          checkout_date?: string
          created_at?: string
          currency?: string
          deposit_amount?: number
          deposit_nights?: number
          deposit_paid?: boolean
          discount_amount?: number | null
          discount_percent?: number | null
          guest_profile_id?: string
          has_discount?: boolean
          id?: string
          listing_id?: string
          nightly_price?: number
          nights?: number
          payment_scheme?: string
          payment_status?: string
          remaining_amount?: number
          remaining_nights?: number
          remaining_paid?: boolean
          remaining_payment_status?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      host_applications: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      host_earnings: {
        Row: {
          available_at: string | null
          created_at: string
          currency: string
          customer_amount: number
          host_amount: number
          host_profile_id: string
          id: string
          paid_at: string | null
          payment_id: string
          payout_id: string | null
          platform_fee: number
          purpose: string
          related_id: string | null
          status: string
        }
        Insert: {
          available_at?: string | null
          created_at?: string
          currency?: string
          customer_amount: number
          host_amount: number
          host_profile_id: string
          id?: string
          paid_at?: string | null
          payment_id: string
          payout_id?: string | null
          platform_fee: number
          purpose: string
          related_id?: string | null
          status: string
        }
        Update: {
          available_at?: string | null
          created_at?: string
          currency?: string
          customer_amount?: number
          host_amount?: number
          host_profile_id?: string
          id?: string
          paid_at?: string | null
          payment_id?: string
          payout_id?: string | null
          platform_fee?: number
          purpose?: string
          related_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_earnings_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_earnings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_earnings_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "host_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      host_payouts: {
        Row: {
          created_at: string
          currency: string
          host_profile_id: string
          id: string
          paid_at: string | null
          payout_method: string
          payout_reference: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          currency?: string
          host_profile_id: string
          id?: string
          paid_at?: string | null
          payout_method: string
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          status: string
          total_amount: number
        }
        Update: {
          created_at?: string
          currency?: string
          host_profile_id?: string
          id?: string
          paid_at?: string | null
          payout_method?: string
          payout_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "host_payouts_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_applications: {
        Row: {
          admin_notes: string | null
          id: string
          profile_id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          profile_id: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          admin_notes?: string | null
          id?: string
          profile_id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_availability: {
        Row: {
          created_at: string
          date: string
          listing_id: string
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          listing_id: string
          source: string
          status: string
        }
        Update: {
          created_at?: string
          date?: string
          listing_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_comments: {
        Row: {
          content: string
          created_at: string
          id: number
          listing_id: string
          parent_comment_id: number | null
          profile_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          listing_id: string
          parent_comment_id?: number | null
          profile_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          listing_id?: string
          parent_comment_id?: number | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "listing_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_conversations: {
        Row: {
          created_at: string
          guest_profile_id: string
          host_profile_id: string
          id: string
          listing_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_profile_id: string
          host_profile_id: string
          id?: string
          listing_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_profile_id?: string
          host_profile_id?: string
          id?: string
          listing_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_conversations_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_conversations_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_features: {
        Row: {
          accessible: boolean
          balcony: boolean
          cctv: boolean
          created_at: string
          elevator: boolean
          fan: boolean
          garden: boolean
          generator: boolean
          gym: boolean
          has_ac: boolean
          has_parking: boolean
          has_wifi: boolean
          is_roadside: boolean | null
          listing_id: string
          mezzanine: boolean
          near_main_road: string | null
          netflix: boolean
          pool: boolean
          prepay_meter: boolean
          rooftop: boolean
          security_guard: boolean
          smart_tv: boolean
          sonnel_meter: boolean
          terrace: boolean
          tv: boolean
          updated_at: string
          veranda: boolean
          washing_machine: boolean
          water_heater: boolean
          water_well: boolean
          within_50m: boolean | null
        }
        Insert: {
          accessible?: boolean
          balcony?: boolean
          cctv?: boolean
          created_at?: string
          elevator?: boolean
          fan?: boolean
          garden?: boolean
          generator?: boolean
          gym?: boolean
          has_ac?: boolean
          has_parking?: boolean
          has_wifi?: boolean
          is_roadside?: boolean | null
          listing_id: string
          mezzanine?: boolean
          near_main_road?: string | null
          netflix?: boolean
          pool?: boolean
          prepay_meter?: boolean
          rooftop?: boolean
          security_guard?: boolean
          smart_tv?: boolean
          sonnel_meter?: boolean
          terrace?: boolean
          tv?: boolean
          updated_at?: string
          veranda?: boolean
          washing_machine?: boolean
          water_heater?: boolean
          water_well?: boolean
          within_50m?: boolean | null
        }
        Update: {
          accessible?: boolean
          balcony?: boolean
          cctv?: boolean
          created_at?: string
          elevator?: boolean
          fan?: boolean
          garden?: boolean
          generator?: boolean
          gym?: boolean
          has_ac?: boolean
          has_parking?: boolean
          has_wifi?: boolean
          is_roadside?: boolean | null
          listing_id?: string
          mezzanine?: boolean
          near_main_road?: string | null
          netflix?: boolean
          pool?: boolean
          prepay_meter?: boolean
          rooftop?: boolean
          security_guard?: boolean
          smart_tv?: boolean
          sonnel_meter?: boolean
          terrace?: boolean
          tv?: boolean
          updated_at?: string
          veranda?: boolean
          washing_machine?: boolean
          water_heater?: boolean
          water_well?: boolean
          within_50m?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_features_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_likes: {
        Row: {
          created_at: string
          id: number
          listing_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          listing_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: number
          listing_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          media_tag: string | null
          media_type: string
          media_url: string
          position: number
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          media_tag?: string | null
          media_type: string
          media_url: string
          position: number
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          media_tag?: string | null
          media_type?: string
          media_url?: string
          position?: number
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          escalated_to_host: boolean
          from_ai: boolean
          id: string
          in_reply_to_message_id: string | null
          is_deleted: boolean
          listing_id: string
          metadata: Json
          requires_host_action: boolean
          sender_profile_id: string | null
          sender_role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          escalated_to_host?: boolean
          from_ai?: boolean
          id?: string
          in_reply_to_message_id?: string | null
          is_deleted?: boolean
          listing_id: string
          metadata?: Json
          requires_host_action?: boolean
          sender_profile_id?: string | null
          sender_role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          escalated_to_host?: boolean
          from_ai?: boolean
          id?: string
          in_reply_to_message_id?: string | null
          is_deleted?: boolean
          listing_id?: string
          metadata?: Json
          requires_host_action?: boolean
          sender_profile_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "listing_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_messages_in_reply_to_message_id_fkey"
            columns: ["in_reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "listing_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_promotions: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          listing_id: string
          nights_required: number
        }
        Insert: {
          created_at?: string
          discount_percent: number
          id?: string
          listing_id: string
          nights_required: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          listing_id?: string
          nights_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_promotions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_rooms: {
        Row: {
          bathrooms: number
          bedrooms: number
          created_at: string
          dining_room: number
          kitchen: number
          listing_id: string
          living_room: number
          toilets: number
          updated_at: string
        }
        Insert: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          dining_room?: number
          kitchen?: number
          listing_id: string
          living_room?: number
          toilets?: number
          updated_at?: string
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          dining_room?: number
          kitchen?: number
          listing_id?: string
          living_room?: number
          toilets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_rooms_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_shares: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          listing_id: string
          profile_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          listing_id: string
          profile_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_shares_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_shares_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          city: string | null
          country: string | null
          device_category: string | null
          duration_seconds: number
          id: number
          listing_id: string
          os: string | null
          profile_id: string | null
          source: string | null
          viewed_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          device_category?: string | null
          duration_seconds?: number
          id?: number
          listing_id: string
          os?: string | null
          profile_id?: string | null
          source?: string | null
          viewed_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          device_category?: string | null
          duration_seconds?: number
          id?: number
          listing_id?: string
          os?: string | null
          profile_id?: string | null
          source?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_text: string | null
          capacity: number
          city: string
          cover_photo_url: string
          created_at: string
          deposit_amount: number | null
          description: string
          district: string
          formatted_address: string | null
          google_address: string | null
          host_id: string
          id: string
          is_available: boolean
          is_furnished: boolean
          latitude: number | null
          longitude: number | null
          min_lease_months: number | null
          music_enabled: boolean
          music_id: string | null
          place_id: string | null
          price_per_month: number | null
          price_per_night: number
          property_type: string
          rental_kind: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          capacity: number
          city: string
          cover_photo_url: string
          created_at?: string
          deposit_amount?: number | null
          description: string
          district: string
          formatted_address?: string | null
          google_address?: string | null
          host_id: string
          id?: string
          is_available?: boolean
          is_furnished?: boolean
          latitude?: number | null
          longitude?: number | null
          min_lease_months?: number | null
          music_enabled?: boolean
          music_id?: string | null
          place_id?: string | null
          price_per_month?: number | null
          price_per_night: number
          property_type: string
          rental_kind?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          capacity?: number
          city?: string
          cover_photo_url?: string
          created_at?: string
          deposit_amount?: number | null
          description?: string
          district?: string
          formatted_address?: string | null
          google_address?: string | null
          host_id?: string
          id?: string
          is_available?: boolean
          is_furnished?: boolean
          latitude?: number | null
          longitude?: number | null
          min_lease_months?: number | null
          music_enabled?: boolean
          music_id?: string | null
          place_id?: string | null
          price_per_month?: number | null
          price_per_night?: number
          property_type?: string
          rental_kind?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_payload: Json | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          paid_at: string | null
          payer_profile_id: string
          provider: string
          provider_channel: string | null
          provider_payment_url: string | null
          provider_reference: string | null
          purpose: string
          raw_provider_payload: Json | null
          related_id: string | null
          status: string
        }
        Insert: {
          amount: number
          client_payload?: Json | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          paid_at?: string | null
          payer_profile_id: string
          provider: string
          provider_channel?: string | null
          provider_payment_url?: string | null
          provider_reference?: string | null
          purpose: string
          raw_provider_payload?: Json | null
          related_id?: string | null
          status: string
        }
        Update: {
          amount?: number
          client_payload?: Json | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          paid_at?: string | null
          payer_profile_id?: string
          provider?: string
          provider_channel?: string | null
          provider_payment_url?: string | null
          provider_reference?: string | null
          purpose?: string
          raw_provider_payload?: Json | null
          related_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payer_profile_id_fkey"
            columns: ["payer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_followed_fk"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follows_follower_fk"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_shares: {
        Row: {
          channel: string
          created_at: string
          id: string
          profile_id: string
          shared_by_profile_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          profile_id: string
          shared_by_profile_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          profile_id?: string
          shared_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_shares_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_shares_shared_by_profile_id_fkey"
            columns: ["shared_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          certified_at: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          enterprise_logo_url: string | null
          enterprise_name: string | null
          first_name: string | null
          gender: string | null
          host_status: string | null
          id: string
          is_certified: boolean
          landlord_status: string | null
          last_name: string | null
          phone: string
          role: string | null
          supply_role: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          certified_at?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          enterprise_logo_url?: string | null
          enterprise_name?: string | null
          first_name?: string | null
          gender?: string | null
          host_status?: string | null
          id: string
          is_certified?: boolean
          landlord_status?: string | null
          last_name?: string | null
          phone: string
          role?: string | null
          supply_role?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          certified_at?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          enterprise_logo_url?: string | null
          enterprise_name?: string | null
          first_name?: string | null
          gender?: string | null
          host_status?: string | null
          id?: string
          is_certified?: boolean
          landlord_status?: string | null
          last_name?: string | null
          phone?: string
          role?: string | null
          supply_role?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_delivery_log: {
        Row: {
          created_at: string
          dedupe_key: string
          event_id: string
          event_table: string
          id: string
          notification_type: string
          recipient_profile_id: string
          status: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          event_id: string
          event_table: string
          id?: string
          notification_type: string
          recipient_profile_id: string
          status?: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          event_id?: string
          event_table?: string
          id?: string
          notification_type?: string
          recipient_profile_id?: string
          status?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          booking_id: string
          completed_at: string | null
          guest_profile_id: string
          id: string
          original_amount: number
          payment_method: string | null
          payment_reference: string | null
          phone_number: string | null
          processed_at: string | null
          refund_amount: number
          refund_notes: string | null
          refund_reason: string
          requested_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          guest_profile_id: string
          id?: string
          original_amount: number
          payment_method?: string | null
          payment_reference?: string | null
          phone_number?: string | null
          processed_at?: string | null
          refund_amount: number
          refund_notes?: string | null
          refund_reason: string
          requested_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          guest_profile_id?: string
          id?: string
          original_amount?: number
          payment_method?: string | null
          payment_reference?: string | null
          phone_number?: string | null
          processed_at?: string | null
          refund_amount?: number
          refund_notes?: string | null
          refund_reason?: string
          requested_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_leases: {
        Row: {
          created_at: string
          currency: string
          end_date: string | null
          id: string
          listing_id: string
          months_count: number | null
          notes: string | null
          owner_profile_id: string | null
          platform_fee_total: number | null
          rent_monthly: number
          start_date: string
          status: string
          tenant_profile_id: string
          total_rent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          listing_id: string
          months_count?: number | null
          notes?: string | null
          owner_profile_id?: string | null
          platform_fee_total?: number | null
          rent_monthly: number
          start_date: string
          status?: string
          tenant_profile_id: string
          total_rent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          listing_id?: string
          months_count?: number | null
          notes?: string | null
          owner_profile_id?: string | null
          platform_fee_total?: number | null
          rent_monthly?: number
          start_date?: string
          status?: string
          tenant_profile_id?: string
          total_rent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_leases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_leases_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_leases_tenant_profile_id_fkey"
            columns: ["tenant_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_visits: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          guest_profile_id: string
          id: string
          notes: string | null
          payment_status: string | null
          reminder_sent_at: string | null
          rental_listing_id: string
          source: string
          status: string
          visit_date: string
          visit_time: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          guest_profile_id: string
          id?: string
          notes?: string | null
          payment_status?: string | null
          reminder_sent_at?: string | null
          rental_listing_id: string
          source?: string
          status?: string
          visit_date: string
          visit_time?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          guest_profile_id?: string
          id?: string
          notes?: string | null
          payment_status?: string | null
          reminder_sent_at?: string | null
          rental_listing_id?: string
          source?: string
          status?: string
          visit_date?: string
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_visits_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_visits_rental_listing_id_fkey"
            columns: ["rental_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          id: number
          listing_id: string
          owner_reply: string | null
          owner_reply_at: string | null
          rating: number
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          id?: number
          listing_id: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          rating: number
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          id?: number
          listing_id?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_heartbeat: {
        Row: {
          app_version: string | null
          city: string | null
          last_activity_at: string
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          city?: string | null
          last_activity_at?: string
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          city?: string | null
          last_activity_at?: string
          platform?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_activity_heartbeat: {
        Row: {
          app_version: string | null
          city: string | null
          last_activity_at: string
          linked_user_id: string | null
          merged_at: string | null
          platform: string | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          app_version?: string | null
          city?: string | null
          last_activity_at?: string
          linked_user_id?: string | null
          merged_at?: string | null
          platform?: string | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          app_version?: string | null
          city?: string | null
          last_activity_at?: string
          linked_user_id?: string | null
          merged_at?: string | null
          platform?: string | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_is_guest: { Args: { guest_id: string }; Returns: boolean }
      current_user_is_listing_host: {
        Args: { listing_id: string }
        Returns: boolean
      }
      current_user_matches_profile: {
        Args: { profile_id: string }
        Returns: boolean
      }
      current_user_phone: { Args: never; Returns: string }
      profile_matches_current_user: {
        Args: { profile_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

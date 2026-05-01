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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      buyer_profiles: {
        Row: {
          buyer_name: string
          categories: string[]
          city: string | null
          company_name: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          max_budget: number | null
          min_budget: number | null
          source_eb_buyer_id: string | null
          state: string | null
          status: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          buyer_name: string
          categories?: string[]
          city?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          max_budget?: number | null
          min_budget?: number | null
          source_eb_buyer_id?: string | null
          state?: string | null
          status?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          buyer_name?: string
          categories?: string[]
          city?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          max_budget?: number | null
          min_budget?: number | null
          source_eb_buyer_id?: string | null
          state?: string | null
          status?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      capital_documents: {
        Row: {
          doc_type: string
          file_url: string
          id: string
          request_id: string
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          doc_type: string
          file_url: string
          id?: string
          request_id: string
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          doc_type?: string
          file_url?: string
          id?: string
          request_id?: string
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_matches: {
        Row: {
          created_at: string | null
          id: string
          match_score: number | null
          notified_at: string | null
          provider_id: string
          request_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_score?: number | null
          notified_at?: string | null
          provider_id: string
          request_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_score?: number | null
          notified_at?: string | null
          provider_id?: string
          request_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_matches_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "capital_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_matches_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "public_capital_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read_at: string | null
          request_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read_at?: string | null
          request_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_providers: {
        Row: {
          active: boolean | null
          contact_email: string | null
          created_at: string | null
          id: string
          instruments: string[] | null
          name: string
          regions: string[] | null
          sectors: string[] | null
          ticket_max: number | null
          ticket_min: number | null
          type: string
          webhook_url: string | null
        }
        Insert: {
          active?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          instruments?: string[] | null
          name: string
          regions?: string[] | null
          sectors?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          type: string
          webhook_url?: string | null
        }
        Update: {
          active?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          instruments?: string[] | null
          name?: string
          regions?: string[] | null
          sectors?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          type?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      capital_requests: {
        Row: {
          approval_score: number | null
          assigned_admin_id: string | null
          capital_type: string
          company_age: string | null
          company_age_months: number | null
          company_name: string
          created_at: string
          email: string | null
          estimated_approval: number | null
          estimated_rate_max: number | null
          estimated_rate_min: number | null
          full_name: string | null
          id: string
          lead_score: number | null
          matched_providers_count: number | null
          monthly_revenue: string | null
          net_profit: string | null
          objective: string
          phone: string | null
          requested_amount: number
          sector: string | null
          sla_deadline: string | null
          source: string | null
          status: string
          success_fee_pct: number | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          views_count: number
        }
        Insert: {
          approval_score?: number | null
          assigned_admin_id?: string | null
          capital_type?: string
          company_age?: string | null
          company_age_months?: number | null
          company_name: string
          created_at?: string
          email?: string | null
          estimated_approval?: number | null
          estimated_rate_max?: number | null
          estimated_rate_min?: number | null
          full_name?: string | null
          id?: string
          lead_score?: number | null
          matched_providers_count?: number | null
          monthly_revenue?: string | null
          net_profit?: string | null
          objective: string
          phone?: string | null
          requested_amount: number
          sector?: string | null
          sla_deadline?: string | null
          source?: string | null
          status?: string
          success_fee_pct?: number | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          views_count?: number
        }
        Update: {
          approval_score?: number | null
          assigned_admin_id?: string | null
          capital_type?: string
          company_age?: string | null
          company_age_months?: number | null
          company_name?: string
          created_at?: string
          email?: string | null
          estimated_approval?: number | null
          estimated_rate_max?: number | null
          estimated_rate_min?: number | null
          full_name?: string | null
          id?: string
          lead_score?: number | null
          matched_providers_count?: number | null
          monthly_revenue?: string | null
          net_profit?: string | null
          objective?: string
          phone?: string | null
          requested_amount?: number
          sector?: string | null
          sla_deadline?: string | null
          source?: string | null
          status?: string
          success_fee_pct?: number | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          views_count?: number
        }
        Relationships: []
      }
      capital_timeline: {
        Row: {
          actor_id: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          request_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_timeline_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "capital_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cnpj_cache: {
        Row: {
          cached_at: string
          cnpj: string
          data: Json
        }
        Insert: {
          cached_at?: string
          cnpj: string
          data: Json
        }
        Update: {
          cached_at?: string
          cnpj?: string
          data?: Json
        }
        Relationships: []
      }
      eb_pipeline_stages: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          id: string
          is_terminal: boolean
          key: string
          label: string
          position: number
          sla_days: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          color?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          key: string
          label: string
          position?: number
          sla_days?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          key?: string
          label?: string
          position?: number
          sla_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      eb_pipeline_transitions: {
        Row: {
          from_outcome: string | null
          from_stage: string | null
          id: string
          mandate_id: string
          moved_at: string
          moved_by: string | null
          note: string | null
          time_in_previous_stage_seconds: number | null
          to_outcome: string | null
          to_stage: string | null
        }
        Insert: {
          from_outcome?: string | null
          from_stage?: string | null
          id?: string
          mandate_id: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          time_in_previous_stage_seconds?: number | null
          to_outcome?: string | null
          to_stage?: string | null
        }
        Update: {
          from_outcome?: string | null
          from_stage?: string | null
          id?: string
          mandate_id?: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          time_in_previous_stage_seconds?: number | null
          to_outcome?: string | null
          to_stage?: string | null
        }
        Relationships: []
      }
      franchisee_regions: {
        Row: {
          categories: string[] | null
          cities: string[] | null
          created_at: string
          id: string
          states: string[] | null
          user_id: string
        }
        Insert: {
          categories?: string[] | null
          cities?: string[] | null
          created_at?: string
          id?: string
          states?: string[] | null
          user_id: string
        }
        Update: {
          categories?: string[] | null
          cities?: string[] | null
          created_at?: string
          id?: string
          states?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      franchisee_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      interest_logs: {
        Row: {
          created_at: string | null
          id: string
          investor_company: string | null
          investor_email: string | null
          investor_name: string | null
          investor_whatsapp: string | null
          listing_id: string
          ticker: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          investor_company?: string | null
          investor_email?: string | null
          investor_name?: string | null
          investor_whatsapp?: string | null
          listing_id: string
          ticker?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          investor_company?: string | null
          investor_email?: string | null
          investor_name?: string | null
          investor_whatsapp?: string | null
          listing_id?: string
          ticker?: string | null
          user_id?: string
        }
        Relationships: []
      }
      listing_financial_docs: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          equity_score: Json | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          listing_id: string
          status: string
          user_id: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          equity_score?: Json | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          listing_id: string
          status?: string
          user_id: string
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          equity_score?: Json | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          listing_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_views: {
        Row: {
          created_at: string
          event_type: string
          id: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          additional_info: string | null
          annual_profit: number | null
          annual_revenue: number | null
          asking_price: number | null
          category: string
          cep: string | null
          city: string | null
          cnpj: string | null
          codename: string | null
          codename_prefix: string | null
          created_at: string | null
          description: string | null
          equity_score: number | null
          foundation_year: number | null
          hide_price: boolean | null
          id: string
          images: string[] | null
          iptu_value: number | null
          neighborhood: string | null
          plan: string | null
          rent_value: number | null
          sale_reason: string | null
          show_address: boolean | null
          square_meters: number | null
          state: string | null
          status: string | null
          street: string | null
          ticker: string | null
          title: string
          updated_at: string | null
          user_id: string
          vdr_readiness: number | null
          verified: boolean | null
          video_url: string | null
        }
        Insert: {
          additional_info?: string | null
          annual_profit?: number | null
          annual_revenue?: number | null
          asking_price?: number | null
          category: string
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          codename?: string | null
          codename_prefix?: string | null
          created_at?: string | null
          description?: string | null
          equity_score?: number | null
          foundation_year?: number | null
          hide_price?: boolean | null
          id?: string
          images?: string[] | null
          iptu_value?: number | null
          neighborhood?: string | null
          plan?: string | null
          rent_value?: number | null
          sale_reason?: string | null
          show_address?: boolean | null
          square_meters?: number | null
          state?: string | null
          status?: string | null
          street?: string | null
          ticker?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          vdr_readiness?: number | null
          verified?: boolean | null
          video_url?: string | null
        }
        Update: {
          additional_info?: string | null
          annual_profit?: number | null
          annual_revenue?: number | null
          asking_price?: number | null
          category?: string
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          codename?: string | null
          codename_prefix?: string | null
          created_at?: string | null
          description?: string | null
          equity_score?: number | null
          foundation_year?: number | null
          hide_price?: boolean | null
          id?: string
          images?: string[] | null
          iptu_value?: number | null
          neighborhood?: string | null
          plan?: string | null
          rent_value?: number | null
          sale_reason?: string | null
          show_address?: boolean | null
          square_meters?: number | null
          state?: string | null
          status?: string | null
          street?: string | null
          ticker?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          vdr_readiness?: number | null
          verified?: boolean | null
          video_url?: string | null
        }
        Relationships: []
      }
      mari_brain_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mari_brain_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "mari_brain_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mari_brain_threads: {
        Row: {
          created_at: string
          id: string
          route: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          route?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          route?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          message: string
          sender_email: string
          sender_name: string
          sender_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          message: string
          sender_email: string
          sender_name: string
          sender_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          message?: string
          sender_email?: string
          sender_name?: string
          sender_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_blind"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunity_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_digest: boolean | null
          is_read: boolean | null
          listing_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_digest?: boolean | null
          is_read?: boolean | null
          listing_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_digest?: boolean | null
          is_read?: boolean | null
          listing_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_blind"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunity_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          partner_user_id: string
          scheduled_at: string | null
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          partner_user_id: string
          scheduled_at?: string | null
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          partner_user_id?: string
          scheduled_at?: string | null
        }
        Relationships: []
      }
      partner_lead_reservations: {
        Row: {
          commission_type: string
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          partner_user_id: string
          qualified_at: string | null
          qualifying_action: string | null
          reserved_at: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          partner_user_id: string
          qualified_at?: string | null
          qualifying_action?: string | null
          reserved_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          partner_user_id?: string
          qualified_at?: string | null
          qualifying_action?: string | null
          reserved_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_opportunity_interests: {
        Row: {
          buyer_description: string | null
          closed_at: string | null
          commission_split: string
          created_at: string
          id: string
          interested_user_id: string
          listing_id: string
          originator_response_at: string | null
          originator_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_description?: string | null
          closed_at?: string | null
          commission_split?: string
          created_at?: string
          id?: string
          interested_user_id: string
          listing_id: string
          originator_response_at?: string | null
          originator_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_description?: string | null
          closed_at?: string | null
          commission_split?: string
          created_at?: string
          id?: string
          interested_user_id?: string
          listing_id?: string
          originator_response_at?: string | null
          originator_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_opportunity_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_opportunity_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_blind"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_opportunity_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunity_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_opportunity_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cep: string | null
          city: string | null
          company_name: string | null
          cpf_cnpj: string | null
          created_at: string
          full_name: string | null
          id: string
          is_partner_accountant: boolean
          neighborhood: string | null
          notification_preference: string | null
          partner_disqualified_at: string | null
          partner_disqualified_reason: string | null
          partner_status: string
          phone: string | null
          state: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cep?: string | null
          city?: string | null
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_partner_accountant?: boolean
          neighborhood?: string | null
          notification_preference?: string | null
          partner_disqualified_at?: string | null
          partner_disqualified_reason?: string | null
          partner_status?: string
          phone?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string | null
          city?: string | null
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_partner_accountant?: boolean
          neighborhood?: string | null
          notification_preference?: string | null
          partner_disqualified_at?: string | null
          partner_disqualified_reason?: string | null
          partner_status?: string
          phone?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string | null
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          dcf_limit: number
          dcf_used: number
          expires_at: string | null
          id: string
          multiples_limit: number
          multiples_used: number
          plan: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dcf_limit?: number
          dcf_used?: number
          expires_at?: string | null
          id?: string
          multiples_limit?: number
          multiples_used?: number
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dcf_limit?: number
          dcf_used?: number
          expires_at?: string | null
          id?: string
          multiples_limit?: number
          multiples_used?: number
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_bots: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      teaser_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuation_history: {
        Row: {
          company_type: string | null
          created_at: string
          id: string
          inputs: Json | null
          locked_at: string | null
          payment_id: string | null
          result: Json | null
          segment: string | null
          status: string
          user_id: string | null
          valuation_type: string
        }
        Insert: {
          company_type?: string | null
          created_at?: string
          id?: string
          inputs?: Json | null
          locked_at?: string | null
          payment_id?: string | null
          result?: Json | null
          segment?: string | null
          status?: string
          user_id?: string | null
          valuation_type: string
        }
        Update: {
          company_type?: string | null
          created_at?: string
          id?: string
          inputs?: Json | null
          locked_at?: string | null
          payment_id?: string | null
          result?: Json | null
          segment?: string | null
          status?: string
          user_id?: string | null
          valuation_type?: string
        }
        Relationships: []
      }
      valuation_purchases: {
        Row: {
          created_at: string | null
          id: string
          price_cents: number
          status: string
          stripe_payment_id: string | null
          type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_cents: number
          status?: string
          stripe_payment_id?: string | null
          type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_cents?: number
          status?: string
          stripe_payment_id?: string | null
          type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vdr_documents: {
        Row: {
          created_at: string
          doc_category: string
          doc_name: string
          file_url: string
          id: string
          listing_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          uploaded_by: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          doc_category: string
          doc_name: string
          file_url: string
          id?: string
          listing_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_by: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          doc_category?: string
          doc_name?: string
          file_url?: string
          id?: string
          listing_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      eb_buyer_preferences_history: {
        Row: {
          after_snap: Json | null
          before_snap: Json | null
          buyer_id: string | null
          changed_at: string | null
          changed_by: string | null
          diff: Json | null
          id: string | null
        }
        Insert: {
          after_snap?: Json | null
          before_snap?: Json | null
          buyer_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          diff?: Json | null
          id?: string | null
        }
        Update: {
          after_snap?: Json | null
          before_snap?: Json | null
          buyer_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          diff?: Json | null
          id?: string | null
        }
        Relationships: []
      }
      eb_buyer_theses: {
        Row: {
          active: boolean | null
          buyer_id: string | null
          created_at: string | null
          custom_notes: string | null
          custom_pitch: string | null
          id: string | null
          prioridade: number | null
          thesis_key: string | null
        }
        Insert: {
          active?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          custom_notes?: string | null
          custom_pitch?: string | null
          id?: string | null
          prioridade?: number | null
          thesis_key?: string | null
        }
        Update: {
          active?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          custom_notes?: string | null
          custom_pitch?: string | null
          id?: string | null
          prioridade?: number | null
          thesis_key?: string | null
        }
        Relationships: []
      }
      eb_buyers: {
        Row: {
          cautela_flag: boolean | null
          cautela_motivo: string | null
          cnpj: string | null
          created_at: string | null
          deals_realizados: number | null
          id: string | null
          municipios_interesse: string[] | null
          nome: string | null
          observacoes: string | null
          porte_alvo: string[] | null
          prioridade_global: number | null
          responsavel_id: string | null
          setores_interesse: string[] | null
          sinergias_chave: string[] | null
          source: string | null
          status: string | null
          subsetores_interesse: string[] | null
          ticket_max: number | null
          ticket_min: number | null
          tipo: string | null
          ufs_interesse: string[] | null
          ultimo_contato_em: string | null
          updated_at: string | null
          vertical_principal: string | null
          website: string | null
        }
        Insert: {
          cautela_flag?: boolean | null
          cautela_motivo?: string | null
          cnpj?: string | null
          created_at?: string | null
          deals_realizados?: number | null
          id?: string | null
          municipios_interesse?: string[] | null
          nome?: string | null
          observacoes?: string | null
          porte_alvo?: string[] | null
          prioridade_global?: number | null
          responsavel_id?: string | null
          setores_interesse?: string[] | null
          sinergias_chave?: string[] | null
          source?: string | null
          status?: string | null
          subsetores_interesse?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          tipo?: string | null
          ufs_interesse?: string[] | null
          ultimo_contato_em?: string | null
          updated_at?: string | null
          vertical_principal?: string | null
          website?: string | null
        }
        Update: {
          cautela_flag?: boolean | null
          cautela_motivo?: string | null
          cnpj?: string | null
          created_at?: string | null
          deals_realizados?: number | null
          id?: string | null
          municipios_interesse?: string[] | null
          nome?: string | null
          observacoes?: string | null
          porte_alvo?: string[] | null
          prioridade_global?: number | null
          responsavel_id?: string | null
          setores_interesse?: string[] | null
          sinergias_chave?: string[] | null
          source?: string | null
          status?: string | null
          subsetores_interesse?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          tipo?: string | null
          ufs_interesse?: string[] | null
          ultimo_contato_em?: string | null
          updated_at?: string | null
          vertical_principal?: string | null
          website?: string | null
        }
        Relationships: []
      }
      eb_buyers_enriched: {
        Row: {
          active_matches_count: number | null
          archetype_id: string | null
          avg_multiple_paid_recent: number | null
          cautela_flag: boolean | null
          cautela_motivo: string | null
          cnpj: string | null
          created_at: string | null
          deals_last_12m: number | null
          deals_realizados: number | null
          embedding: string | null
          embedding_computed_at: string | null
          embedding_text_hash: string | null
          id: string | null
          median_target_size_recent: number | null
          municipios_interesse: string[] | null
          nome: string | null
          observacoes: string | null
          pause_signal: boolean | null
          pe_sponsor_entry_date: string | null
          pe_sponsor_name: string | null
          porte_alvo: string[] | null
          primary_contact: Json | null
          prioridade_global: number | null
          raw_data: Json | null
          recent_capital_raise_brl: number | null
          recent_capital_raise_date: string | null
          responsavel_id: string | null
          setores_interesse: string[] | null
          sinergias_chave: string[] | null
          source: string | null
          status: string | null
          subsetores_interesse: string[] | null
          ticket_max: number | null
          ticket_min: number | null
          tipo: string | null
          ufs_interesse: string[] | null
          ultimo_contato_em: string | null
          updated_at: string | null
          vertical_principal: string | null
          website: string | null
        }
        Insert: {
          active_matches_count?: never
          archetype_id?: string | null
          avg_multiple_paid_recent?: number | null
          cautela_flag?: boolean | null
          cautela_motivo?: string | null
          cnpj?: string | null
          created_at?: string | null
          deals_last_12m?: number | null
          deals_realizados?: number | null
          embedding?: string | null
          embedding_computed_at?: string | null
          embedding_text_hash?: string | null
          id?: string | null
          median_target_size_recent?: number | null
          municipios_interesse?: string[] | null
          nome?: string | null
          observacoes?: string | null
          pause_signal?: boolean | null
          pe_sponsor_entry_date?: string | null
          pe_sponsor_name?: string | null
          porte_alvo?: string[] | null
          primary_contact?: never
          prioridade_global?: number | null
          raw_data?: Json | null
          recent_capital_raise_brl?: number | null
          recent_capital_raise_date?: string | null
          responsavel_id?: string | null
          setores_interesse?: string[] | null
          sinergias_chave?: string[] | null
          source?: string | null
          status?: string | null
          subsetores_interesse?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          tipo?: string | null
          ufs_interesse?: string[] | null
          ultimo_contato_em?: string | null
          updated_at?: string | null
          vertical_principal?: string | null
          website?: string | null
        }
        Update: {
          active_matches_count?: never
          archetype_id?: string | null
          avg_multiple_paid_recent?: number | null
          cautela_flag?: boolean | null
          cautela_motivo?: string | null
          cnpj?: string | null
          created_at?: string | null
          deals_last_12m?: number | null
          deals_realizados?: number | null
          embedding?: string | null
          embedding_computed_at?: string | null
          embedding_text_hash?: string | null
          id?: string | null
          median_target_size_recent?: number | null
          municipios_interesse?: string[] | null
          nome?: string | null
          observacoes?: string | null
          pause_signal?: boolean | null
          pe_sponsor_entry_date?: string | null
          pe_sponsor_name?: string | null
          porte_alvo?: string[] | null
          primary_contact?: never
          prioridade_global?: number | null
          raw_data?: Json | null
          recent_capital_raise_brl?: number | null
          recent_capital_raise_date?: string | null
          responsavel_id?: string | null
          setores_interesse?: string[] | null
          sinergias_chave?: string[] | null
          source?: string | null
          status?: string | null
          subsetores_interesse?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          tipo?: string | null
          ufs_interesse?: string[] | null
          ultimo_contato_em?: string | null
          updated_at?: string | null
          vertical_principal?: string | null
          website?: string | null
        }
        Relationships: []
      }
      eb_call_feedback: {
        Row: {
          ai_extracted: Json | null
          bdr_user_id: string | null
          call_at: string | null
          cnpj: string | null
          created_at: string | null
          dor_principal: string | null
          duration_seconds: number | null
          ebitda_revelado: number | null
          faturamento_revelado: number | null
          followup_action: string | null
          followup_at: string | null
          id: string | null
          interest_level: number | null
          num_socios_real: number | null
          outcome: string | null
          raw_notes: string | null
          signals_added: string[] | null
          timing_estimado: string | null
          updated_at: string | null
        }
        Insert: {
          ai_extracted?: Json | null
          bdr_user_id?: string | null
          call_at?: string | null
          cnpj?: string | null
          created_at?: string | null
          dor_principal?: string | null
          duration_seconds?: number | null
          ebitda_revelado?: number | null
          faturamento_revelado?: number | null
          followup_action?: string | null
          followup_at?: string | null
          id?: string | null
          interest_level?: number | null
          num_socios_real?: number | null
          outcome?: string | null
          raw_notes?: string | null
          signals_added?: string[] | null
          timing_estimado?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_extracted?: Json | null
          bdr_user_id?: string | null
          call_at?: string | null
          cnpj?: string | null
          created_at?: string | null
          dor_principal?: string | null
          duration_seconds?: number | null
          ebitda_revelado?: number | null
          faturamento_revelado?: number | null
          followup_action?: string | null
          followup_at?: string | null
          id?: string | null
          interest_level?: number | null
          num_socios_real?: number | null
          outcome?: string | null
          raw_notes?: string | null
          signals_added?: string[] | null
          timing_estimado?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      eb_companies: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnae_secundarios: Json | null
          cnpj: string | null
          codename: string | null
          codename_prefix: string | null
          created_at: string | null
          data_abertura: string | null
          data_situacao_cadastral: string | null
          ebitda_estimado: number | null
          embedding: string | null
          embedding_computed_at: string | null
          embedding_text_hash: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          faturamento_estimado: number | null
          funcionarios_estimado: number | null
          has_listing: boolean | null
          last_enriched_at: string | null
          latitude: number | null
          linked_buyer_id: string | null
          listing_id: string | null
          longitude: number | null
          municipio: string | null
          natureza_descricao: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          porte: string | null
          promoted_at: string | null
          promoted_from: string | null
          qtd_socios: number | null
          qualification_source: string | null
          qualification_status:
            | "qualified"
            | "unqualified"
            | "cold_market_map"
            | "cold_prospect"
            | "contacted"
            | "relationship_started"
            | "lost"
            | "do_not_contact"
            | null
          qualified_at: string | null
          qualified_by: string | null
          raw_data: Json | null
          razao_social: string | null
          setor_ma: string | null
          situacao_cadastral: string | null
          socios_pf: number | null
          socios_pj: number | null
          source: string | null
          subsetor_ma: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnae_secundarios?: Json | null
          cnpj?: string | null
          codename?: string | null
          codename_prefix?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_situacao_cadastral?: string | null
          ebitda_estimado?: number | null
          embedding?: string | null
          embedding_computed_at?: string | null
          embedding_text_hash?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          faturamento_estimado?: number | null
          funcionarios_estimado?: number | null
          has_listing?: boolean | null
          last_enriched_at?: string | null
          latitude?: number | null
          linked_buyer_id?: string | null
          listing_id?: string | null
          longitude?: number | null
          municipio?: string | null
          natureza_descricao?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          promoted_at?: string | null
          promoted_from?: string | null
          qtd_socios?: number | null
          qualification_source?: string | null
          qualification_status?:
            | "qualified"
            | "unqualified"
            | "cold_market_map"
            | "cold_prospect"
            | "contacted"
            | "relationship_started"
            | "lost"
            | "do_not_contact"
            | null
          qualified_at?: string | null
          qualified_by?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          setor_ma?: string | null
          situacao_cadastral?: string | null
          socios_pf?: number | null
          socios_pj?: number | null
          source?: string | null
          subsetor_ma?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnae_secundarios?: Json | null
          cnpj?: string | null
          codename?: string | null
          codename_prefix?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_situacao_cadastral?: string | null
          ebitda_estimado?: number | null
          embedding?: string | null
          embedding_computed_at?: string | null
          embedding_text_hash?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          faturamento_estimado?: number | null
          funcionarios_estimado?: number | null
          has_listing?: boolean | null
          last_enriched_at?: string | null
          latitude?: number | null
          linked_buyer_id?: string | null
          listing_id?: string | null
          longitude?: number | null
          municipio?: string | null
          natureza_descricao?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          promoted_at?: string | null
          promoted_from?: string | null
          qtd_socios?: number | null
          qualification_source?: string | null
          qualification_status?:
            | "qualified"
            | "unqualified"
            | "cold_market_map"
            | "cold_prospect"
            | "contacted"
            | "relationship_started"
            | "lost"
            | "do_not_contact"
            | null
          qualified_at?: string | null
          qualified_by?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          setor_ma?: string | null
          situacao_cadastral?: string | null
          socios_pf?: number | null
          socios_pj?: number | null
          source?: string | null
          subsetor_ma?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      eb_companies_enriched: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnae_secundarios: Json | null
          cnpj: string | null
          created_at: string | null
          data_abertura: string | null
          data_situacao_cadastral: string | null
          ebitda_estimado: number | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          faturamento_estimado: number | null
          funcionarios_estimado: number | null
          has_listing: boolean | null
          last_enriched_at: string | null
          latitude: number | null
          listing_asking_price: number | null
          listing_created_at: string | null
          listing_id: string | null
          listing_title: string | null
          longitude: number | null
          municipio: string | null
          natureza_descricao: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          porte: string | null
          qtd_socios: number | null
          raw_data: Json | null
          razao_social: string | null
          setor_ma: string | null
          signal_count: number | null
          signal_weight_sum: number | null
          signals: Json | null
          situacao_cadastral: string | null
          socios_pf: number | null
          socios_pj: number | null
          source: string | null
          subsetor_ma: string | null
          uf: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      eb_companies_scored: {
        Row: {
          buyer_fit_score: number | null
          capital_social: number | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          data_abertura: string | null
          has_listing: boolean | null
          idade_empresa: number | null
          listing_id: string | null
          ma_breakdown: Json | null
          ma_score: number | null
          municipio: string | null
          nome_fantasia: string | null
          porte: string | null
          qtd_socios: number | null
          razao_social: string | null
          scores_computed_at: string | null
          setor_ma: string | null
          subsetor_ma: string | null
          sucessao_breakdown: Json | null
          sucessao_score: number | null
          uf: string | null
          vispe_breakdown: Json | null
          vispe_score: number | null
        }
        Relationships: []
      }
      eb_company_scores: {
        Row: {
          buyer_fit_score: number | null
          cnpj: string | null
          computed_at: string | null
          formula_version: string | null
          id: string | null
          is_current: boolean | null
          ma_breakdown: Json | null
          ma_score: number | null
          score_engine_version: string | null
          sucessao_breakdown: Json | null
          sucessao_score: number | null
          vispe_breakdown: Json | null
          vispe_score: number | null
        }
        Insert: {
          buyer_fit_score?: number | null
          cnpj?: string | null
          computed_at?: string | null
          formula_version?: string | null
          id?: string | null
          is_current?: boolean | null
          ma_breakdown?: Json | null
          ma_score?: number | null
          score_engine_version?: string | null
          sucessao_breakdown?: Json | null
          sucessao_score?: number | null
          vispe_breakdown?: Json | null
          vispe_score?: number | null
        }
        Update: {
          buyer_fit_score?: number | null
          cnpj?: string | null
          computed_at?: string | null
          formula_version?: string | null
          id?: string | null
          is_current?: boolean | null
          ma_breakdown?: Json | null
          ma_score?: number | null
          score_engine_version?: string | null
          sucessao_breakdown?: Json | null
          sucessao_score?: number | null
          vispe_breakdown?: Json | null
          vispe_score?: number | null
        }
        Relationships: []
      }
      eb_company_signals: {
        Row: {
          cnpj: string | null
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          signal_key: string | null
          signal_text: string | null
          signal_value: number | null
          source: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          cnpj?: string | null
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          signal_key?: string | null
          signal_text?: string | null
          signal_value?: number | null
          source?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          cnpj?: string | null
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          signal_key?: string | null
          signal_text?: string | null
          signal_value?: number | null
          source?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      eb_contacts: {
        Row: {
          cargo: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          entity_id: string | null
          entity_type: "mandate" | "buyer" | null
          id: string | null
          is_primary: boolean | null
          nome: string | null
          notas: string | null
          source: string | null
          telefone_e164: string | null
          updated_at: string | null
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          entity_id?: string | null
          entity_type?: "mandate" | "buyer" | null
          id?: string | null
          is_primary?: boolean | null
          nome?: string | null
          notas?: string | null
          source?: string | null
          telefone_e164?: string | null
          updated_at?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          entity_id?: string | null
          entity_type?: "mandate" | "buyer" | null
          id?: string | null
          is_primary?: boolean | null
          nome?: string | null
          notas?: string | null
          source?: string | null
          telefone_e164?: string | null
          updated_at?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Relationships: []
      }
      eb_crm_activities: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          direction: "out" | "in" | "system" | null
          entity_id: string | null
          entity_type: "mandate" | "buyer" | null
          id: string | null
          kind:
            | "whatsapp"
            | "call"
            | "email"
            | "meeting"
            | "note"
            | "status_change"
            | "preference_change"
            | "match_event"
            | null
          metadata: Json | null
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          direction?: "out" | "in" | "system" | null
          entity_id?: string | null
          entity_type?: "mandate" | "buyer" | null
          id?: string | null
          kind?:
            | "whatsapp"
            | "call"
            | "email"
            | "meeting"
            | "note"
            | "status_change"
            | "preference_change"
            | "match_event"
            | null
          metadata?: Json | null
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          direction?: "out" | "in" | "system" | null
          entity_id?: string | null
          entity_type?: "mandate" | "buyer" | null
          id?: string | null
          kind?:
            | "whatsapp"
            | "call"
            | "email"
            | "meeting"
            | "note"
            | "status_change"
            | "preference_change"
            | "match_event"
            | null
          metadata?: Json | null
        }
        Relationships: []
      }
      eb_crm_audit: {
        Row: {
          company_cnpj: string | null
          created_at: string | null
          deal_confidence: string | null
          deal_kind: string | null
          deal_origin: string | null
          display_name: string | null
          id: string | null
          issue_fake_cnpj: boolean | null
          issue_no_contact: boolean | null
          issue_no_owner: boolean | null
          issue_no_value: boolean | null
          issue_stuck_match: boolean | null
          needs_enrichment: boolean | null
          outcome:
            | "em_andamento"
            | "concluido"
            | "cancelado"
            | "vencido"
            | "vendeu_sozinho"
            | "vigente"
            | "vendemos"
            | "em_negociacao"
            | null
          pipeline_stage:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          responsavel_id: string | null
          stage_changed_at: string | null
          status:
            | "vigente"
            | "vencido"
            | "vendemos"
            | "em_negociacao"
            | "vendeu_sozinho"
            | "cancelado"
            | null
          updated_at: string | null
        }
        Relationships: []
      }
      eb_crm_audit_v2: {
        Row: {
          check_key: string | null
          label: string | null
          sample_ids: string[] | null
          severity: string | null
          total: number | null
        }
        Relationships: []
      }
      eb_crm_kpis: {
        Row: {
          comissao_realizada: number | null
          mandates_cancelado: number | null
          mandates_em_negociacao: number | null
          mandates_precisa_enriquecer: number | null
          mandates_presos_match: number | null
          mandates_sem_responsavel: number | null
          mandates_vencido: number | null
          mandates_vendemos: number | null
          mandates_vigente: number | null
          ticket_medio: number | null
          total_buyers_active: number | null
          total_mandates: number | null
          total_mandates_real: number | null
          total_marketplace: number | null
          total_vendedores_sem_mandato: number | null
          valor_total_carteira: number | null
        }
        Relationships: []
      }
      eb_events: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          event_type: string | null
          id: number | null
          payload: Json | null
          processed_at: string | null
          processed_status: string | null
          retry_count: number | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: number | null
          payload?: Json | null
          processed_at?: string | null
          processed_status?: string | null
          retry_count?: number | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: number | null
          payload?: Json | null
          processed_at?: string | null
          processed_status?: string | null
          retry_count?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      eb_investment_theses: {
        Row: {
          active: boolean | null
          boosting_signals: string[] | null
          category: string | null
          default_pitch_template: string | null
          description: string | null
          display_name: string | null
          required_signals: string[] | null
          thesis_key: string | null
        }
        Insert: {
          active?: boolean | null
          boosting_signals?: string[] | null
          category?: string | null
          default_pitch_template?: string | null
          description?: string | null
          display_name?: string | null
          required_signals?: string[] | null
          thesis_key?: string | null
        }
        Update: {
          active?: boolean | null
          boosting_signals?: string[] | null
          category?: string | null
          default_pitch_template?: string | null
          description?: string | null
          display_name?: string | null
          required_signals?: string[] | null
          thesis_key?: string | null
        }
        Relationships: []
      }
      eb_isp_city_stats: {
        Row: {
          calc_version: string | null
          computed_at: string | null
          dominant_player: boolean | null
          fragmentation_score: number | null
          hhi: number | null
          ibge_code: string | null
          id: string | null
          leader_cnpj: string | null
          leader_share: number | null
          municipio: string | null
          n_providers: number | null
          period_ref: string | null
          rollup_opportunity_score: number | null
          top3_share: number | null
          total_accesses: number | null
          uf: string | null
        }
        Insert: {
          calc_version?: string | null
          computed_at?: string | null
          dominant_player?: boolean | null
          fragmentation_score?: number | null
          hhi?: number | null
          ibge_code?: string | null
          id?: string | null
          leader_cnpj?: string | null
          leader_share?: number | null
          municipio?: string | null
          n_providers?: number | null
          period_ref?: string | null
          rollup_opportunity_score?: number | null
          top3_share?: number | null
          total_accesses?: number | null
          uf?: string | null
        }
        Update: {
          calc_version?: string | null
          computed_at?: string | null
          dominant_player?: boolean | null
          fragmentation_score?: number | null
          hhi?: number | null
          ibge_code?: string | null
          id?: string | null
          leader_cnpj?: string | null
          leader_share?: number | null
          municipio?: string | null
          n_providers?: number | null
          period_ref?: string | null
          rollup_opportunity_score?: number | null
          top3_share?: number | null
          total_accesses?: number | null
          uf?: string | null
        }
        Relationships: []
      }
      eb_isp_company_stats: {
        Row: {
          best_thesis_key: string | null
          best_thesis_score: number | null
          calc_version: string | null
          cnpj: string | null
          computed_at: string | null
          fragmentation_exposure: number | null
          geographic_density: number | null
          growth_vs_prev: number | null
          id: string | null
          local_leader_score: number | null
          main_city_ibge: string | null
          main_city_share: number | null
          n_municipios: number | null
          n_ufs: number | null
          period_ref: string | null
          platform_potential_score: number | null
          provider_name_norm: string | null
          regional_presence_score: number | null
          rollup_target_score: number | null
          sellability_score: number | null
          subscale_pressure_score: number | null
          total_accesses: number | null
        }
        Relationships: []
      }
      eb_isp_market_entries: {
        Row: {
          accesses: number | null
          cnpj: string | null
          created_at: string | null
          ibge_code: string | null
          id: string | null
          import_id: string | null
          municipio: string | null
          period_ref: string | null
          provider_name: string | null
          provider_name_norm: string | null
          raw: Json | null
          service_type: string | null
          source: string | null
          technology: string | null
          uf: string | null
        }
        Insert: {
          accesses?: number | null
          cnpj?: string | null
          created_at?: string | null
          ibge_code?: string | null
          id?: string | null
          import_id?: string | null
          municipio?: string | null
          period_ref?: string | null
          provider_name?: string | null
          provider_name_norm?: string | null
          raw?: Json | null
          service_type?: string | null
          source?: string | null
          technology?: string | null
          uf?: string | null
        }
        Update: {
          accesses?: number | null
          cnpj?: string | null
          created_at?: string | null
          ibge_code?: string | null
          id?: string | null
          import_id?: string | null
          municipio?: string | null
          period_ref?: string | null
          provider_name?: string | null
          provider_name_norm?: string | null
          raw?: Json | null
          service_type?: string | null
          source?: string | null
          technology?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      eb_isp_uf_summary: {
        Row: {
          avg_fragmentation: number | null
          avg_rollup_opportunity: number | null
          n_cities: number | null
          n_providers_sum: number | null
          period_ref: string | null
          total_accesses: number | null
          uf: string | null
        }
        Relationships: []
      }
      eb_mandates: {
        Row: {
          comissao_pct: number | null
          commission_pct: number | null
          company_cnpj: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          created_by: string | null
          data_assinatura: string | null
          data_fechamento: string | null
          data_inicio: string | null
          data_vencimento: string | null
          deal_type:
            | "buyside"
            | "sellside"
            | "spa"
            | "due_diligence"
            | "cisao"
            | "fusao"
            | "nbo"
            | "match"
            | null
          exclusividade: boolean | null
          expected_close_at: string | null
          faturamento_vispe: number | null
          id: string | null
          observacoes: string | null
          outcome:
            | "em_andamento"
            | "concluido"
            | "cancelado"
            | "vencido"
            | "vendeu_sozinho"
            | "vigente"
            | "vendemos"
            | "em_negociacao"
            | null
          pipeline_stage:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          probability: number | null
          regiao: string | null
          responsavel_id: string | null
          setor: string | null
          source: string | null
          stage_changed_at: string | null
          status:
            | "vigente"
            | "vencido"
            | "vendemos"
            | "em_negociacao"
            | "vendeu_sozinho"
            | "cancelado"
            | null
          temperature: string | null
          temperature_reason: string | null
          temperature_updated_at: string | null
          uf: string | null
          updated_at: string | null
          valor_operacao: number | null
          valor_pedido: number | null
        }
        Insert: {
          comissao_pct?: number | null
          commission_pct?: number | null
          company_cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_fechamento?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          deal_type?:
            | "buyside"
            | "sellside"
            | "spa"
            | "due_diligence"
            | "cisao"
            | "fusao"
            | "nbo"
            | "match"
            | null
          exclusividade?: boolean | null
          expected_close_at?: string | null
          faturamento_vispe?: number | null
          id?: string | null
          observacoes?: string | null
          outcome?:
            | "em_andamento"
            | "concluido"
            | "cancelado"
            | "vencido"
            | "vendeu_sozinho"
            | "vigente"
            | "vendemos"
            | "em_negociacao"
            | null
          pipeline_stage?:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          probability?: number | null
          regiao?: string | null
          responsavel_id?: string | null
          setor?: string | null
          source?: string | null
          stage_changed_at?: string | null
          status?:
            | "vigente"
            | "vencido"
            | "vendemos"
            | "em_negociacao"
            | "vendeu_sozinho"
            | "cancelado"
            | null
          temperature?: string | null
          temperature_reason?: string | null
          temperature_updated_at?: string | null
          uf?: string | null
          updated_at?: string | null
          valor_operacao?: number | null
          valor_pedido?: number | null
        }
        Update: {
          comissao_pct?: number | null
          commission_pct?: number | null
          company_cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          created_by?: string | null
          data_assinatura?: string | null
          data_fechamento?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          deal_type?:
            | "buyside"
            | "sellside"
            | "spa"
            | "due_diligence"
            | "cisao"
            | "fusao"
            | "nbo"
            | "match"
            | null
          exclusividade?: boolean | null
          expected_close_at?: string | null
          faturamento_vispe?: number | null
          id?: string | null
          observacoes?: string | null
          outcome?:
            | "em_andamento"
            | "concluido"
            | "cancelado"
            | "vencido"
            | "vendeu_sozinho"
            | "vigente"
            | "vendemos"
            | "em_negociacao"
            | null
          pipeline_stage?:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          probability?: number | null
          regiao?: string | null
          responsavel_id?: string | null
          setor?: string | null
          source?: string | null
          stage_changed_at?: string | null
          status?:
            | "vigente"
            | "vencido"
            | "vendemos"
            | "em_negociacao"
            | "vendeu_sozinho"
            | "cancelado"
            | null
          temperature?: string | null
          temperature_reason?: string | null
          temperature_updated_at?: string | null
          uf?: string | null
          updated_at?: string | null
          valor_operacao?: number | null
          valor_pedido?: number | null
        }
        Relationships: []
      }
      eb_mandates_enriched: {
        Row: {
          codename: string | null
          comissao_pct: number | null
          commission_pct: number | null
          company_cnpj: string | null
          comprador_cnpj: string | null
          comprador_nome: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          contract_url: string | null
          created_at: string | null
          data_assinatura: string | null
          data_assinatura_contrato: string | null
          data_fechamento: string | null
          data_inicio: string | null
          data_vencimento: string | null
          deal_confidence: string | null
          deal_kind: string | null
          deal_origin: string | null
          deal_type:
            | "buyside"
            | "sellside"
            | "spa"
            | "due_diligence"
            | "cisao"
            | "fusao"
            | "nbo"
            | "match"
            | null
          display_name: string | null
          drive_url: string | null
          exclusividade: boolean | null
          expected_close_at: string | null
          faturamento_estimado: number | null
          faturamento_vispe: number | null
          has_listing: boolean | null
          id: string | null
          listing_id: string | null
          match_buyer_id: string | null
          municipio: string | null
          needs_enrichment: boolean | null
          nome_fantasia: string | null
          observacoes: string | null
          outcome:
            | "em_andamento"
            | "concluido"
            | "cancelado"
            | "vencido"
            | "vendeu_sozinho"
            | "vigente"
            | "vendemos"
            | "em_negociacao"
            | null
          pipeline_stage:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          primary_contact: Json | null
          probability: number | null
          razao_social: string | null
          regiao: string | null
          regiao_calc: string | null
          responsavel_id: string | null
          setor_ma: string | null
          setor_mandate: string | null
          source: string | null
          stage_changed_at: string | null
          status:
            | "vigente"
            | "vencido"
            | "vendemos"
            | "em_negociacao"
            | "vendeu_sozinho"
            | "cancelado"
            | null
          subsetor_ma: string | null
          temperature: string | null
          temperature_reason: string | null
          temperature_updated_at: string | null
          uf: string | null
          uf_mandate: string | null
          updated_at: string | null
          valor_operacao: number | null
          valor_pedido: number | null
        }
        Relationships: []
      }
      eb_matches: {
        Row: {
          ai_confidence: number | null
          ai_pitch: string | null
          ai_thesis_summary: string | null
          assigned_bdr: string | null
          buyer_archetype: string | null
          buyer_id: string | null
          cnpj: string | null
          computed_at: string | null
          engine_version: string | null
          ev_p50: number | null
          feature_contributions: Json | null
          geografia_fit: number | null
          id: string | null
          is_current: boolean | null
          ma_score_emp: number | null
          match_score: number | null
          multiple_p50: number | null
          p_close_12m: number | null
          porte_fit: number | null
          prioridade: number | null
          reasons: Json | null
          setor_fit: number | null
          status: string | null
          tese_fit: number | null
          thesis_key: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_pitch?: string | null
          ai_thesis_summary?: string | null
          assigned_bdr?: string | null
          buyer_archetype?: string | null
          buyer_id?: string | null
          cnpj?: string | null
          computed_at?: string | null
          engine_version?: string | null
          ev_p50?: number | null
          feature_contributions?: Json | null
          geografia_fit?: number | null
          id?: string | null
          is_current?: boolean | null
          ma_score_emp?: number | null
          match_score?: number | null
          multiple_p50?: number | null
          p_close_12m?: number | null
          porte_fit?: number | null
          prioridade?: number | null
          reasons?: Json | null
          setor_fit?: number | null
          status?: string | null
          tese_fit?: number | null
          thesis_key?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_pitch?: string | null
          ai_thesis_summary?: string | null
          assigned_bdr?: string | null
          buyer_archetype?: string | null
          buyer_id?: string | null
          cnpj?: string | null
          computed_at?: string | null
          engine_version?: string | null
          ev_p50?: number | null
          feature_contributions?: Json | null
          geografia_fit?: number | null
          id?: string | null
          is_current?: boolean | null
          ma_score_emp?: number | null
          match_score?: number | null
          multiple_p50?: number | null
          p_close_12m?: number | null
          porte_fit?: number | null
          prioridade?: number | null
          reasons?: Json | null
          setor_fit?: number | null
          status?: string | null
          tese_fit?: number | null
          thesis_key?: string | null
        }
        Relationships: []
      }
      eb_matches_enriched: {
        Row: {
          ai_pitch: string | null
          ai_thesis_summary: string | null
          assigned_bdr: string | null
          buyer_id: string | null
          buyer_nome: string | null
          buyer_tipo: string | null
          capital_social: number | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          computed_at: string | null
          data_abertura: string | null
          geografia_fit: number | null
          has_listing: boolean | null
          id: string | null
          ma_score: number | null
          ma_score_emp: number | null
          match_score: number | null
          municipio: string | null
          nome_fantasia: string | null
          porte: string | null
          porte_fit: number | null
          prioridade: number | null
          qtd_socios: number | null
          razao_social: string | null
          reasons: Json | null
          setor_fit: number | null
          setor_ma: string | null
          setores_interesse: string[] | null
          status: string | null
          subsetor_ma: string | null
          sucessao_score: number | null
          tese_fit: number | null
          thesis_category: string | null
          thesis_description: string | null
          thesis_key: string | null
          thesis_name: string | null
          ticket_max: number | null
          ticket_min: number | null
          uf: string | null
          vispe_score: number | null
        }
        Relationships: []
      }
      eb_opportunities_ready: {
        Row: {
          ai_pitch: string | null
          assigned_bdr: string | null
          best_thesis_key: string | null
          best_thesis_name: string | null
          bubble_color: string | null
          bubble_size: number | null
          buyers_count: number | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          data_abertura: string | null
          default_pitch: string | null
          has_listing: boolean | null
          latitude: number | null
          listing_id: string | null
          longitude: number | null
          ma_score: number | null
          municipio: string | null
          nome_fantasia: string | null
          razao_social: string | null
          refreshed_at: string | null
          setor_ma: string | null
          situacao_cadastral: string | null
          source_match_count: number | null
          status: string | null
          subsetor_ma: string | null
          sucessao_score: number | null
          top_buyers: Json | null
          uf: string | null
          vispe_score: number | null
        }
        Relationships: []
      }
      eb_score_engine_versions: {
        Row: {
          activated_at: string | null
          created_at: string | null
          created_by: string | null
          deactivated_at: string | null
          description: string | null
          id: string | null
          notes: string | null
          thresholds_json: Json | null
          version: string | null
          weights_json: Json | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          thresholds_json?: Json | null
          version?: string | null
          weights_json?: Json | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deactivated_at?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          thresholds_json?: Json | null
          version?: string | null
          weights_json?: Json | null
        }
        Relationships: []
      }
      eb_signal_catalog: {
        Row: {
          affects_scores: string[] | null
          category: string | null
          default_weight: number | null
          description: string | null
          signal_key: string | null
        }
        Insert: {
          affects_scores?: string[] | null
          category?: string | null
          default_weight?: number | null
          description?: string | null
          signal_key?: string | null
        }
        Update: {
          affects_scores?: string[] | null
          category?: string | null
          default_weight?: number | null
          description?: string | null
          signal_key?: string | null
        }
        Relationships: []
      }
      eb_v_bdr_history: {
        Row: {
          bdr_user_id: string | null
          call_at: string | null
          cnpj: string | null
          dor_principal: string | null
          followup_action: string | null
          followup_at: string | null
          id: string | null
          interest_level: number | null
          ma_score: number | null
          outcome: string | null
          razao_social: string | null
          sucessao_score: number | null
          timing_estimado: string | null
          vispe_score: number | null
        }
        Relationships: []
      }
      eb_v_deal_metrics: {
        Row: {
          commission_pct: number | null
          company_cnpj: string | null
          company_name: string | null
          created_at: string | null
          data_assinatura: string | null
          data_fechamento: string | null
          data_inicio: string | null
          data_vencimento: string | null
          deal_type:
            | "buyside"
            | "sellside"
            | "spa"
            | "due_diligence"
            | "cisao"
            | "fusao"
            | "nbo"
            | "match"
            | null
          exclusividade: boolean | null
          faturamento_vispe: number | null
          id: string | null
          months_to_close: number | null
          outcome:
            | "em_andamento"
            | "concluido"
            | "cancelado"
            | "vencido"
            | "vendeu_sozinho"
            | "vigente"
            | "vendemos"
            | "em_negociacao"
            | null
          pipeline_stage:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          probability: number | null
          regiao: string | null
          responsavel_id: string | null
          setor: string | null
          status:
            | "vigente"
            | "vencido"
            | "vendemos"
            | "em_negociacao"
            | "vendeu_sozinho"
            | "cancelado"
            | null
          temperature: string | null
          uf: string | null
          updated_at: string | null
          valor_operacao: number | null
          valor_pedido: number | null
          year_started: number | null
        }
        Relationships: []
      }
      listings_blind: {
        Row: {
          asking_price: number | null
          category: string | null
          city: string | null
          cnpj: string | null
          codename: string | null
          codename_prefix: string | null
          created_at: string | null
          description: string | null
          equity_score: number | null
          faixa_faturamento: string | null
          faixa_lucro: string | null
          foundation_year: number | null
          id: string | null
          images: string[] | null
          plan: string | null
          state: string | null
          status: string | null
          title: string | null
          vdr_readiness: number | null
          video_url: string | null
        }
        Insert: {
          asking_price?: never
          category?: string | null
          city?: never
          cnpj?: never
          codename?: string | null
          codename_prefix?: string | null
          created_at?: string | null
          description?: never
          equity_score?: number | null
          faixa_faturamento?: never
          faixa_lucro?: never
          foundation_year?: number | null
          id?: string | null
          images?: never
          plan?: string | null
          state?: string | null
          status?: string | null
          title?: never
          vdr_readiness?: number | null
          video_url?: never
        }
        Update: {
          asking_price?: never
          category?: string | null
          city?: never
          cnpj?: never
          codename?: string | null
          codename_prefix?: string | null
          created_at?: string | null
          description?: never
          equity_score?: number | null
          faixa_faturamento?: never
          faixa_lucro?: never
          foundation_year?: number | null
          id?: string | null
          images?: never
          plan?: string | null
          state?: string | null
          status?: string | null
          title?: never
          vdr_readiness?: number | null
          video_url?: never
        }
        Relationships: []
      }
      partner_opportunity_pool: {
        Row: {
          annual_profit: number | null
          annual_revenue: number | null
          asking_price: number | null
          category: string | null
          city: string | null
          created_at: string | null
          description: string | null
          equity_score: number | null
          foundation_year: number | null
          hide_price: boolean | null
          id: string | null
          images: string[] | null
          interest_count: number | null
          is_my_lead: boolean | null
          neighborhood: string | null
          originator_state: string | null
          originator_type: string | null
          plan: string | null
          reservation_expires_at: string | null
          reservation_status: string | null
          state: string | null
          ticker: string | null
          title: string | null
          vdr_readiness: number | null
        }
        Relationships: []
      }
      public_buyer_profiles: {
        Row: {
          buyer_name: string | null
          categories: string[] | null
          city: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          max_budget: number | null
          min_budget: number | null
          state: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          buyer_name?: string | null
          categories?: string[] | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          max_budget?: number | null
          min_budget?: number | null
          state?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          buyer_name?: string | null
          categories?: string[] | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          max_budget?: number | null
          min_budget?: number | null
          state?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_capital_providers: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string | null
          instruments: string[] | null
          name: string | null
          regions: string[] | null
          sectors: string[] | null
          ticket_max: number | null
          ticket_min: number | null
          type: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          instruments?: string[] | null
          name?: string | null
          regions?: string[] | null
          sectors?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          type?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          instruments?: string[] | null
          name?: string | null
          regions?: string[] | null
          sectors?: string[] | null
          ticket_max?: number | null
          ticket_min?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_listings: {
        Row: {
          additional_info: string | null
          annual_profit: number | null
          annual_revenue: number | null
          asking_price: number | null
          category: string | null
          city: string | null
          created_at: string | null
          description: string | null
          equity_score: number | null
          foundation_year: number | null
          hide_price: boolean | null
          id: string | null
          images: string[] | null
          iptu_value: number | null
          neighborhood: string | null
          plan: string | null
          rent_value: number | null
          sale_reason: string | null
          square_meters: number | null
          state: string | null
          status: string | null
          ticker: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          annual_profit?: number | null
          annual_revenue?: number | null
          asking_price?: number | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          equity_score?: number | null
          foundation_year?: number | null
          hide_price?: boolean | null
          id?: string | null
          images?: string[] | null
          iptu_value?: number | null
          neighborhood?: string | null
          plan?: string | null
          rent_value?: number | null
          sale_reason?: string | null
          square_meters?: number | null
          state?: string | null
          status?: string | null
          ticker?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          annual_profit?: number | null
          annual_revenue?: number | null
          asking_price?: number | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          equity_score?: number | null
          foundation_year?: number | null
          hide_price?: boolean | null
          id?: string | null
          images?: string[] | null
          iptu_value?: number | null
          neighborhood?: string | null
          plan?: string | null
          rent_value?: number | null
          sale_reason?: string | null
          square_meters?: number | null
          state?: string | null
          status?: string | null
          ticker?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buyer_neutral_description: {
        Args: {
          _setores: string[]
          _tmax: number
          _tmin: number
          _ufs: string[]
        }
        Returns: string
      }
      buyer_pseudonym: { Args: { _id: string; _tipo: string }; Returns: string }
      calculate_vdr_readiness: {
        Args: { p_listing_id: string }
        Returns: number
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      eb_can_view_identity: {
        Args: { p_cnpj?: string; p_listing?: string }
        Returns: boolean
      }
      eb_dashboard_kpis: { Args: never; Returns: Json }
      eb_dashboard_kpis_v2: { Args: never; Returns: Json }
      eb_decide_disclosure: {
        Args: {
          p_decision: string
          p_expires_in_days?: number
          p_notes?: string
          p_request_id: string
        }
        Returns: Json
      }
      eb_event_queue_stats: { Args: never; Returns: Json }
      eb_event_recent_errors: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string
          event_type: string
          id: number
          retry_count: number
        }[]
      }
      eb_get_drain_job: {
        Args: { p_job_id: string }
        Returns: {
          error_message: string
          finished_at: string
          id: string
          started_at: string
          status: string
          totals: Json
        }[]
      }
      eb_log_deal_event: {
        Args: {
          p_event_type: string
          p_match_id: string
          p_metadata?: Json
          p_notes?: string
          p_rejection_reason?: string
        }
        Returns: string
      }
      eb_match_crosstab: {
        Args: { dim?: string }
        Returns: {
          buyers_count: number
          label: string
          mandates_count: number
        }[]
      }
      eb_request_disclosure: {
        Args: {
          p_reason?: string
          p_target_cnpj?: string
          p_target_kind: string
          p_target_listing_id?: string
        }
        Returns: string
      }
      eb_upsert_mandate: { Args: { p: Json }; Returns: string }
      expire_old_reservations: { Args: never; Returns: undefined }
      get_teaser_view_count: {
        Args: { p_listing_id: string }
        Returns: {
          total_views: number
          unique_views: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_capital_view: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      qualify_lead:
        | {
            Args: {
              p_entity_id: string
              p_entity_type: string
              p_notes?: string
              p_source?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_buyer_profile?: Json
              p_company_profile?: Json
              p_entity_id: string
              p_entity_type: string
              p_notes?: string
              p_promote_to_buyer?: boolean
              p_promote_to_company?: boolean
              p_source?: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role: "seller" | "buyer" | "advisor" | "admin" | "franchisee"
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
  public: {
    Enums: {
      app_role: ["seller", "buyer", "advisor", "admin", "franchisee"],
    },
  },
} as const

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
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          created_at: string | null
          data_abertura: string | null
          ebitda_estimado: number | null
          faturamento_estimado: number | null
          funcionarios_estimado: number | null
          has_listing: boolean | null
          last_enriched_at: string | null
          latitude: number | null
          listing_id: string | null
          longitude: number | null
          municipio: string | null
          natureza_descricao: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          porte: string | null
          qtd_socios: number | null
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
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string | null
          created_at?: string | null
          data_abertura?: string | null
          ebitda_estimado?: number | null
          faturamento_estimado?: number | null
          funcionarios_estimado?: number | null
          has_listing?: boolean | null
          last_enriched_at?: string | null
          latitude?: number | null
          listing_id?: string | null
          longitude?: number | null
          municipio?: string | null
          natureza_descricao?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          qtd_socios?: number | null
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
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string | null
          created_at?: string | null
          data_abertura?: string | null
          ebitda_estimado?: number | null
          faturamento_estimado?: number | null
          funcionarios_estimado?: number | null
          has_listing?: boolean | null
          last_enriched_at?: string | null
          latitude?: number | null
          listing_id?: string | null
          longitude?: number | null
          municipio?: string | null
          natureza_descricao?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          porte?: string | null
          qtd_socios?: number | null
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
      eb_matches: {
        Row: {
          ai_confidence: number | null
          ai_pitch: string | null
          ai_thesis_summary: string | null
          assigned_bdr: string | null
          buyer_id: string | null
          cnpj: string | null
          computed_at: string | null
          geografia_fit: number | null
          id: string | null
          is_current: boolean | null
          ma_score_emp: number | null
          match_score: number | null
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
          buyer_id?: string | null
          cnpj?: string | null
          computed_at?: string | null
          geografia_fit?: number | null
          id?: string | null
          is_current?: boolean | null
          ma_score_emp?: number | null
          match_score?: number | null
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
          buyer_id?: string | null
          cnpj?: string | null
          computed_at?: string | null
          geografia_fit?: number | null
          id?: string | null
          is_current?: boolean | null
          ma_score_emp?: number | null
          match_score?: number | null
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
      eb_v_isp_universe: {
        Row: {
          buyer_fit_score: number | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          faturamento_estimado: number | null
          has_listing: boolean | null
          ma_score: number | null
          municipio: string | null
          nome_fantasia: string | null
          porte: string | null
          qtd_socios: number | null
          razao_social: string | null
          scores_computed_at: string | null
          situacao_cadastral: string | null
          sucessao_score: number | null
          uf: string | null
          vispe_score: number | null
        }
        Relationships: []
      }
      eb_v_opportunities_by_municipio: {
        Row: {
          avg_ma_score: number | null
          lat_centroid: number | null
          lng_centroid: number | null
          municipio: string | null
          premium_count: number | null
          total: number | null
          uf: string | null
        }
        Relationships: []
      }
      eb_v_opportunities_by_uf: {
        Row: {
          avg_ma_score: number | null
          premium_count: number | null
          strong_count: number | null
          top_setor: string | null
          total: number | null
          uf: string | null
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

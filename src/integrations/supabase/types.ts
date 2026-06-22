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
      advisor_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_whatsapp_config: {
        Row: {
          access_token_secret_id: string
          advisor_id: string
          connected_at: string | null
          created_at: string
          id: string
          is_mock: boolean
          last_error: string | null
          last_message_received_at: string | null
          phone_number: string
          phone_number_id: string
          status: string
          total_messages_captured: number
          updated_at: string
          verify_token: string
          webhook_url: string
        }
        Insert: {
          access_token_secret_id: string
          advisor_id: string
          connected_at?: string | null
          created_at?: string
          id?: string
          is_mock?: boolean
          last_error?: string | null
          last_message_received_at?: string | null
          phone_number: string
          phone_number_id: string
          status?: string
          total_messages_captured?: number
          updated_at?: string
          verify_token: string
          webhook_url: string
        }
        Update: {
          access_token_secret_id?: string
          advisor_id?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          is_mock?: boolean
          last_error?: string | null
          last_message_received_at?: string | null
          phone_number?: string
          phone_number_id?: string
          status?: string
          total_messages_captured?: number
          updated_at?: string
          verify_token?: string
          webhook_url?: string
        }
        Relationships: []
      }
      advisor_whatsapp_setup_pending: {
        Row: {
          advisor_id: string
          created_at: string
          error_message: string | null
          expires_at: string
          id: string
          is_mock: boolean
          max_attempts: number
          phone_number: string
          phone_number_id: string | null
          sms_code_attempt_count: number
          status: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          is_mock?: boolean
          max_attempts?: number
          phone_number: string
          phone_number_id?: string | null
          sms_code_attempt_count?: number
          status?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          is_mock?: boolean
          max_attempts?: number
          phone_number?: string
          phone_number_id?: string | null
          sms_code_attempt_count?: number
          status?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          metadata: Json | null
          path: string | null
          referrer: string | null
          session_key: string | null
          title: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          session_key?: string | null
          title?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          session_key?: string | null
          title?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          country: string | null
          device: string | null
          first_seen_at: string
          id: string
          is_new_visitor: boolean | null
          last_seen_at: string
          referrer: string | null
          session_key: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          country?: string | null
          device?: string | null
          first_seen_at?: string
          id?: string
          is_new_visitor?: boolean | null
          last_seen_at?: string
          referrer?: string | null
          session_key: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          country?: string | null
          device?: string | null
          first_seen_at?: string
          id?: string
          is_new_visitor?: boolean | null
          last_seen_at?: string
          referrer?: string | null
          session_key?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      api_pricing: {
        Row: {
          category: string
          created_at: string
          currency: string
          effective_from: string
          flat_per_call_usd: number | null
          id: string
          input_per_1m_usd: number | null
          model: string
          notes: string | null
          output_per_1m_usd: number | null
          provider: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          effective_from?: string
          flat_per_call_usd?: number | null
          id?: string
          input_per_1m_usd?: number | null
          model?: string
          notes?: string | null
          output_per_1m_usd?: number | null
          provider: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          effective_from?: string
          flat_per_call_usd?: number | null
          id?: string
          input_per_1m_usd?: number | null
          model?: string
          notes?: string | null
          output_per_1m_usd?: number | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          category: string
          cost_brl: number | null
          cost_usd: number | null
          created_at: string
          error_message: string | null
          feature: string | null
          function_name: string | null
          http_status: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          provider: string
          request_count: number
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          category?: string
          cost_brl?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          feature?: string | null
          function_name?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          provider: string
          request_count?: number
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          cost_brl?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          feature?: string | null
          function_name?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          provider?: string
          request_count?: number
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_role: Database["public"]["Enums"]["app_role"] | null
          actor_user_id: string | null
          created_at: string
          deal_id: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          ip: unknown
          payload: Json
          user_agent: string | null
        }
        Insert: {
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          created_at?: string
          deal_id?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          ip?: unknown
          payload?: Json
          user_agent?: string | null
        }
        Update: {
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          created_at?: string
          deal_id?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          ip?: unknown
          payload?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      buyer_deal_access: {
        Row: {
          access_level: string
          buyer_user_id: string
          deal_id: string
          granted_at: string
          granted_by: string | null
          id: string
          note: string | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          access_level?: string
          buyer_user_id: string
          deal_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          access_level?: string
          buyer_user_id?: string
          deal_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: []
      }
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
          source_doc_id: string | null
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          doc_type: string
          file_url: string
          id?: string
          request_id: string
          source_doc_id?: string | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          doc_type?: string
          file_url?: string
          id?: string
          request_id?: string
          source_doc_id?: string | null
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
      dashboard_insight_cache: {
        Row: {
          body: string
          dashboard_type: string
          generated_at: string
          snapshot_hash: string
        }
        Insert: {
          body: string
          dashboard_type: string
          generated_at?: string
          snapshot_hash: string
        }
        Update: {
          body?: string
          dashboard_type?: string
          generated_at?: string
          snapshot_hash?: string
        }
        Relationships: []
      }
      deal_closing_emails_log: {
        Row: {
          created_at: string
          deal_document_id: string | null
          deal_pair_id: string
          error: string | null
          id: string
          recipient_email: string
          recipient_type: string
          sent_at: string | null
          template: string
        }
        Insert: {
          created_at?: string
          deal_document_id?: string | null
          deal_pair_id: string
          error?: string | null
          id?: string
          recipient_email: string
          recipient_type: string
          sent_at?: string | null
          template: string
        }
        Update: {
          created_at?: string
          deal_document_id?: string | null
          deal_pair_id?: string
          error?: string | null
          id?: string
          recipient_email?: string
          recipient_type?: string
          sent_at?: string | null
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_closing_emails_log_deal_document_id_fkey"
            columns: ["deal_document_id"]
            isOneToOne: false
            referencedRelation: "deal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_closing_emails_log_deal_pair_id_fkey"
            columns: ["deal_pair_id"]
            isOneToOne: false
            referencedRelation: "deal_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_closing_emails_log_deal_pair_id_fkey"
            columns: ["deal_pair_id"]
            isOneToOne: false
            referencedRelation: "deal_pairs_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_documents: {
        Row: {
          ai_fallback_used: boolean
          ai_model: string | null
          ai_provider: string | null
          category: string
          created_at: string
          critique_errors: Json | null
          critique_passed: boolean | null
          critique_score: number | null
          custom_fields_snapshot: Json
          deal_id: string | null
          deal_pair_id: string | null
          generated_body: string | null
          homologation_status: string
          id: string
          label: string
          metadata: Json
          parent_version_id: string | null
          partner_approved_at: string | null
          partner_approved_by: string | null
          partner_comments: string | null
          requires_partner_approval: boolean
          signature_provider: string | null
          signature_request_id: string | null
          signed_at: string | null
          signed_by: string | null
          signing_url: string | null
          stage_key: string | null
          status: string
          storage_path: string | null
          template_code: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          version_number: number
          visible_to_buyer: boolean
        }
        Insert: {
          ai_fallback_used?: boolean
          ai_model?: string | null
          ai_provider?: string | null
          category?: string
          created_at?: string
          critique_errors?: Json | null
          critique_passed?: boolean | null
          critique_score?: number | null
          custom_fields_snapshot?: Json
          deal_id?: string | null
          deal_pair_id?: string | null
          generated_body?: string | null
          homologation_status?: string
          id?: string
          label: string
          metadata?: Json
          parent_version_id?: string | null
          partner_approved_at?: string | null
          partner_approved_by?: string | null
          partner_comments?: string | null
          requires_partner_approval?: boolean
          signature_provider?: string | null
          signature_request_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signing_url?: string | null
          stage_key?: string | null
          status?: string
          storage_path?: string | null
          template_code?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_number?: number
          visible_to_buyer?: boolean
        }
        Update: {
          ai_fallback_used?: boolean
          ai_model?: string | null
          ai_provider?: string | null
          category?: string
          created_at?: string
          critique_errors?: Json | null
          critique_passed?: boolean | null
          critique_score?: number | null
          custom_fields_snapshot?: Json
          deal_id?: string | null
          deal_pair_id?: string | null
          generated_body?: string | null
          homologation_status?: string
          id?: string
          label?: string
          metadata?: Json
          parent_version_id?: string | null
          partner_approved_at?: string | null
          partner_approved_by?: string | null
          partner_comments?: string | null
          requires_partner_approval?: boolean
          signature_provider?: string | null
          signature_request_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signing_url?: string | null
          stage_key?: string | null
          status?: string
          storage_path?: string | null
          template_code?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_number?: number
          visible_to_buyer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_deal_pair_id_fkey"
            columns: ["deal_pair_id"]
            isOneToOne: false
            referencedRelation: "deal_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_deal_pair_id_fkey"
            columns: ["deal_pair_id"]
            isOneToOne: false
            referencedRelation: "deal_pairs_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "deal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_documents_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "doc_templates"
            referencedColumns: ["code"]
          },
        ]
      }
      deal_pairs: {
        Row: {
          buy_mandate_id: string | null
          buyer_profile_id: string | null
          closed_at: string | null
          comissao_buy_pct: number | null
          comissao_sell_pct: number | null
          created_at: string
          created_by: string | null
          data_pareamento: string
          id: string
          lost_reason: string | null
          nbo_signed_at: string | null
          notes: string | null
          responsavel_advisor_id: string
          sell_mandate_id: string
          source_match_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buy_mandate_id?: string | null
          buyer_profile_id?: string | null
          closed_at?: string | null
          comissao_buy_pct?: number | null
          comissao_sell_pct?: number | null
          created_at?: string
          created_by?: string | null
          data_pareamento?: string
          id?: string
          lost_reason?: string | null
          nbo_signed_at?: string | null
          notes?: string | null
          responsavel_advisor_id: string
          sell_mandate_id: string
          source_match_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buy_mandate_id?: string | null
          buyer_profile_id?: string | null
          closed_at?: string | null
          comissao_buy_pct?: number | null
          comissao_sell_pct?: number | null
          created_at?: string
          created_by?: string | null
          data_pareamento?: string
          id?: string
          lost_reason?: string | null
          nbo_signed_at?: string | null
          notes?: string | null
          responsavel_advisor_id?: string
          sell_mandate_id?: string
          source_match_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      deal_qa: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          author_role: string
          author_user_id: string
          buyer_user_id: string
          created_at: string
          deal_id: string
          id: string
          parent_id: string | null
          question: string
          updated_at: string
          visible_to_buyer: boolean
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          author_role: string
          author_user_id: string
          buyer_user_id: string
          created_at?: string
          deal_id: string
          id?: string
          parent_id?: string | null
          question: string
          updated_at?: string
          visible_to_buyer?: boolean
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          author_role?: string
          author_user_id?: string
          buyer_user_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          parent_id?: string | null
          question?: string
          updated_at?: string
          visible_to_buyer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deal_qa_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "deal_qa"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_templates: {
        Row: {
          ai_instructions: string | null
          applies_to_stages: string[]
          category: string
          code: string
          created_at: string
          customizable_fields: Json
          description: string | null
          id: string
          is_active: boolean
          label: string
          parts: Json
          preferred_model: string | null
          requires_signature: boolean
          static_clauses: Json
          storage_path: string | null
          template_body: string | null
          updated_at: string
        }
        Insert: {
          ai_instructions?: string | null
          applies_to_stages?: string[]
          category: string
          code: string
          created_at?: string
          customizable_fields?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          parts?: Json
          preferred_model?: string | null
          requires_signature?: boolean
          static_clauses?: Json
          storage_path?: string | null
          template_body?: string | null
          updated_at?: string
        }
        Update: {
          ai_instructions?: string | null
          applies_to_stages?: string[]
          category?: string
          code?: string
          created_at?: string
          customizable_fields?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          parts?: Json
          preferred_model?: string | null
          requires_signature?: boolean
          static_clauses?: Json
          storage_path?: string | null
          template_body?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doc_templates_archive: {
        Row: {
          ai_instructions: string | null
          archived_at: string
          archived_reason: string | null
          code: string
          customizable_fields: Json | null
          id: string
          preferred_model: string | null
          static_clauses: Json | null
          template_body: string | null
        }
        Insert: {
          ai_instructions?: string | null
          archived_at?: string
          archived_reason?: string | null
          code: string
          customizable_fields?: Json | null
          id?: string
          preferred_model?: string | null
          static_clauses?: Json | null
          template_body?: string | null
        }
        Update: {
          ai_instructions?: string | null
          archived_at?: string
          archived_reason?: string | null
          code?: string
          customizable_fields?: Json | null
          id?: string
          preferred_model?: string | null
          static_clauses?: Json | null
          template_body?: string | null
        }
        Relationships: []
      }
      due_diligence_audits: {
        Row: {
          answers: Json
          classification: string | null
          completed: boolean
          created_at: string
          id: string
          score_pct: number
          total_items: number
          updated_at: string
          user_id: string
          yes_count: number
        }
        Insert: {
          answers?: Json
          classification?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          score_pct?: number
          total_items?: number
          updated_at?: string
          user_id: string
          yes_count?: number
        }
        Update: {
          answers?: Json
          classification?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          score_pct?: number
          total_items?: number
          updated_at?: string
          user_id?: string
          yes_count?: number
        }
        Relationships: []
      }
      eb_pipeline_stages: {
        Row: {
          archived_at: string | null
          baseline_days: number | null
          baseline_hours: number | null
          color: string
          created_at: string
          id: string
          is_terminal: boolean
          is_v2_only: boolean
          key: string
          label: string
          position: number
          sla_days: number
          target_days: number | null
          target_hours: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          baseline_days?: number | null
          baseline_hours?: number | null
          color?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          is_v2_only?: boolean
          key: string
          label: string
          position?: number
          sla_days?: number
          target_days?: number | null
          target_hours?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          baseline_days?: number | null
          baseline_hours?: number | null
          color?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          is_v2_only?: boolean
          key?: string
          label?: string
          position?: number
          sla_days?: number
          target_days?: number | null
          target_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      eb_pipeline_transitions: {
        Row: {
          actual_hours: number | null
          deal_id: string | null
          delta_days: number | null
          delta_hours: number | null
          exit_reason: string | null
          from_outcome: string | null
          from_stage: string | null
          id: string
          mandate_id: string
          moved_at: string
          moved_by: string | null
          note: string | null
          responsible_user_id: string | null
          target_days: number | null
          target_hours: number | null
          time_in_previous_stage_seconds: number | null
          to_outcome: string | null
          to_stage: string | null
        }
        Insert: {
          actual_hours?: number | null
          deal_id?: string | null
          delta_days?: number | null
          delta_hours?: number | null
          exit_reason?: string | null
          from_outcome?: string | null
          from_stage?: string | null
          id?: string
          mandate_id: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          responsible_user_id?: string | null
          target_days?: number | null
          target_hours?: number | null
          time_in_previous_stage_seconds?: number | null
          to_outcome?: string | null
          to_stage?: string | null
        }
        Update: {
          actual_hours?: number | null
          deal_id?: string | null
          delta_days?: number | null
          delta_hours?: number | null
          exit_reason?: string | null
          from_outcome?: string | null
          from_stage?: string | null
          id?: string
          mandate_id?: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          responsible_user_id?: string | null
          target_days?: number | null
          target_hours?: number | null
          time_in_previous_stage_seconds?: number | null
          to_outcome?: string | null
          to_stage?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      equity_annual_plan: {
        Row: {
          assessment_id: string
          company_id: string
          created_at: string
          generated_at: string
          id: string
          model_used: string | null
          plan_data: Json
          source_prompts: Json | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          company_id: string
          created_at?: string
          generated_at?: string
          id?: string
          model_used?: string | null
          plan_data: Json
          source_prompts?: Json | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          company_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          model_used?: string | null
          plan_data?: Json
          source_prompts?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_annual_plan_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_archetype_migrations: {
        Row: {
          bloqueadores: string[] | null
          created_at: string
          de_arquetipo_id: string
          delta_multiplo_esperado: number
          descricao_curta: string | null
          descricao_rota: string
          exemplos: string[] | null
          id: string
          para_arquetipo_id: string
          titulo: string
        }
        Insert: {
          bloqueadores?: string[] | null
          created_at?: string
          de_arquetipo_id: string
          delta_multiplo_esperado?: number
          descricao_curta?: string | null
          descricao_rota: string
          exemplos?: string[] | null
          id?: string
          para_arquetipo_id: string
          titulo: string
        }
        Update: {
          bloqueadores?: string[] | null
          created_at?: string
          de_arquetipo_id?: string
          delta_multiplo_esperado?: number
          descricao_curta?: string | null
          descricao_rota?: string
          exemplos?: string[] | null
          id?: string
          para_arquetipo_id?: string
          titulo?: string
        }
        Relationships: []
      }
      equity_archetypes: {
        Row: {
          created_at: string
          descricao: string | null
          exemplos_setor: string[] | null
          faixa_multiplo_max: number
          faixa_multiplo_min: number
          id: string
          killers: Json | null
          kpis: Json | null
          nome: string
          ordem: number | null
          pesos_dimensoes: Json
          piso_liquidez: number
          universo_compradores: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          exemplos_setor?: string[] | null
          faixa_multiplo_max: number
          faixa_multiplo_min: number
          id: string
          killers?: Json | null
          kpis?: Json | null
          nome: string
          ordem?: number | null
          pesos_dimensoes: Json
          piso_liquidez?: number
          universo_compradores?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          exemplos_setor?: string[] | null
          faixa_multiplo_max?: number
          faixa_multiplo_min?: number
          id?: string
          killers?: Json | null
          kpis?: Json | null
          nome?: string
          ordem?: number | null
          pesos_dimensoes?: Json
          piso_liquidez?: number
          universo_compradores?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      equity_assessments: {
        Row: {
          archetype_classification: Json | null
          arquetipo_id: string | null
          arquetipo_sugerido: string | null
          company_id: string
          confianca_arquetipo: number | null
          created_at: string
          id: string
          ipe_composto: number | null
          migracao_arquetipo_sugerida: Json | null
          parent_assessment_id: string | null
          promoted_at: string | null
          promoted_by: string | null
          promoted_mandate_id: string | null
          raw_intake: Json | null
          rodada: number | null
          source: string
          status: string
          summary: string | null
          updated_at: string
          user_id: string
          veredito_liquidez: string | null
        }
        Insert: {
          archetype_classification?: Json | null
          arquetipo_id?: string | null
          arquetipo_sugerido?: string | null
          company_id: string
          confianca_arquetipo?: number | null
          created_at?: string
          id?: string
          ipe_composto?: number | null
          migracao_arquetipo_sugerida?: Json | null
          parent_assessment_id?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_mandate_id?: string | null
          raw_intake?: Json | null
          rodada?: number | null
          source?: string
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
          veredito_liquidez?: string | null
        }
        Update: {
          archetype_classification?: Json | null
          arquetipo_id?: string | null
          arquetipo_sugerido?: string | null
          company_id?: string
          confianca_arquetipo?: number | null
          created_at?: string
          id?: string
          ipe_composto?: number | null
          migracao_arquetipo_sugerida?: Json | null
          parent_assessment_id?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_mandate_id?: string | null
          raw_intake?: Json | null
          rodada?: number | null
          source?: string
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
          veredito_liquidez?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_assessments_arquetipo_id_fkey"
            columns: ["arquetipo_id"]
            isOneToOne: false
            referencedRelation: "equity_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_assessments_arquetipo_sugerido_fkey"
            columns: ["arquetipo_sugerido"]
            isOneToOne: false
            referencedRelation: "equity_archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "equity_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_assessments_parent_assessment_id_fkey"
            columns: ["parent_assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_buyer_archetypes: {
        Row: {
          arquetipo_comprador: string
          created_at: string
          exemplos_targets: Json | null
          id: string
          nome_perfil: string
          premio_tipico_max: number | null
          premio_tipico_min: number | null
          seller_arquetipo_id: string
          setor_alvo: string | null
          sinergias_padrao: Json | null
          tese_padrao: string
        }
        Insert: {
          arquetipo_comprador: string
          created_at?: string
          exemplos_targets?: Json | null
          id?: string
          nome_perfil: string
          premio_tipico_max?: number | null
          premio_tipico_min?: number | null
          seller_arquetipo_id: string
          setor_alvo?: string | null
          sinergias_padrao?: Json | null
          tese_padrao: string
        }
        Update: {
          arquetipo_comprador?: string
          created_at?: string
          exemplos_targets?: Json | null
          id?: string
          nome_perfil?: string
          premio_tipico_max?: number | null
          premio_tipico_min?: number | null
          seller_arquetipo_id?: string
          setor_alvo?: string | null
          sinergias_padrao?: Json | null
          tese_padrao?: string
        }
        Relationships: []
      }
      equity_buyer_map: {
        Row: {
          arquetipo_comprador: string
          assessment_id: string
          carta_convite: string | null
          created_at: string
          exemplos_targets: Json | null
          id: string
          nome_alvo: string | null
          premio_estimado_pct: number | null
          premio_estimado_valor: number | null
          prioridade: number | null
          racional_premio: string | null
          selecionado: boolean
          setor_alvo: string | null
          sinergias: Json | null
          tese_aquisicao: string | null
        }
        Insert: {
          arquetipo_comprador: string
          assessment_id: string
          carta_convite?: string | null
          created_at?: string
          exemplos_targets?: Json | null
          id?: string
          nome_alvo?: string | null
          premio_estimado_pct?: number | null
          premio_estimado_valor?: number | null
          prioridade?: number | null
          racional_premio?: string | null
          selecionado?: boolean
          setor_alvo?: string | null
          sinergias?: Json | null
          tese_aquisicao?: string | null
        }
        Update: {
          arquetipo_comprador?: string
          assessment_id?: string
          carta_convite?: string | null
          created_at?: string
          exemplos_targets?: Json | null
          id?: string
          nome_alvo?: string | null
          premio_estimado_pct?: number | null
          premio_estimado_valor?: number | null
          prioridade?: number | null
          racional_premio?: string | null
          selecionado?: boolean
          setor_alvo?: string | null
          sinergias?: Json | null
          tese_aquisicao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_buyer_map_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_companies: {
        Row: {
          arquetipo_id: string | null
          cidade: string | null
          cnae: string | null
          cnpj: string | null
          created_at: string
          id: string
          porte: string | null
          razao_social: string | null
          regime_tributario: string | null
          setor_livre: string | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arquetipo_id?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          porte?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          setor_livre?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arquetipo_id?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          porte?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          setor_livre?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_companies_arquetipo_id_fkey"
            columns: ["arquetipo_id"]
            isOneToOne: false
            referencedRelation: "equity_archetypes"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_company_documents: {
        Row: {
          assessment_id: string | null
          company_id: string | null
          created_at: string
          doc_type: string | null
          extracted_json: Json | null
          extraction_error: string | null
          extraction_status: string
          extraction_summary: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          company_id?: string | null
          created_at?: string
          doc_type?: string | null
          extracted_json?: Json | null
          extraction_error?: string | null
          extraction_status?: string
          extraction_summary?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          company_id?: string | null
          created_at?: string
          doc_type?: string | null
          extracted_json?: Json | null
          extraction_error?: string | null
          extraction_status?: string
          extraction_summary?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_company_documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "equity_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_comps_benchmarks: {
        Row: {
          arquetipo_id: string
          created_at: string
          fonte: string | null
          id: string
          metrica: string
          multiplo_max: number
          multiplo_min: number
          multiplo_p25: number | null
          multiplo_p50: number | null
          multiplo_p75: number | null
          multiplo_top10: number | null
          porte: string
          sample_n: number | null
          setor: string | null
          vigencia: string | null
        }
        Insert: {
          arquetipo_id: string
          created_at?: string
          fonte?: string | null
          id?: string
          metrica?: string
          multiplo_max: number
          multiplo_min: number
          multiplo_p25?: number | null
          multiplo_p50?: number | null
          multiplo_p75?: number | null
          multiplo_top10?: number | null
          porte: string
          sample_n?: number | null
          setor?: string | null
          vigencia?: string | null
        }
        Update: {
          arquetipo_id?: string
          created_at?: string
          fonte?: string | null
          id?: string
          metrica?: string
          multiplo_max?: number
          multiplo_min?: number
          multiplo_p25?: number | null
          multiplo_p50?: number | null
          multiplo_p75?: number | null
          multiplo_top10?: number | null
          porte?: string
          sample_n?: number | null
          setor?: string | null
          vigencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_comps_benchmarks_arquetipo_id_fkey"
            columns: ["arquetipo_id"]
            isOneToOne: false
            referencedRelation: "equity_archetypes"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_dimension_benchmarks: {
        Row: {
          arquetipo_id: string
          created_at: string
          dimensao_key: string
          fonte: string
          id: string
          p25: number
          p50: number
          p75: number
          p90: number
          porte: string
          sample_n: number
          vigencia: string
        }
        Insert: {
          arquetipo_id: string
          created_at?: string
          dimensao_key: string
          fonte?: string
          id?: string
          p25: number
          p50: number
          p75: number
          p90: number
          porte: string
          sample_n?: number
          vigencia?: string
        }
        Update: {
          arquetipo_id?: string
          created_at?: string
          dimensao_key?: string
          fonte?: string
          id?: string
          p25?: number
          p50?: number
          p75?: number
          p90?: number
          porte?: string
          sample_n?: number
          vigencia?: string
        }
        Relationships: []
      }
      equity_dimension_scores: {
        Row: {
          assessment_id: string
          created_at: string
          destruidor_top: boolean | null
          dimensao: string
          evidencias: Json | null
          id: string
          peso: number | null
          score: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          destruidor_top?: boolean | null
          dimensao: string
          evidencias?: Json | null
          id?: string
          peso?: number | null
          score: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          destruidor_top?: boolean | null
          dimensao?: string
          evidencias?: Json | null
          id?: string
          peso?: number | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "equity_dimension_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_initiative_deepdive: {
        Row: {
          answers: Json
          assessment_id: string
          compiled_prompt: string | null
          completed_at: string | null
          created_at: string
          id: string
          initiative_id: string
          questions: Json
          status: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          compiled_prompt?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          initiative_id: string
          questions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          compiled_prompt?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          initiative_id?: string
          questions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_initiative_deepdive_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_initiative_deepdive_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: true
            referencedRelation: "equity_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_initiative_library: {
        Row: {
          arquetipo_id: string | null
          created_at: string
          delta_ipe_padrao: number | null
          descricao: string | null
          dimensao: string
          esforco: string | null
          id: string
          prazo_meses: number | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          arquetipo_id?: string | null
          created_at?: string
          delta_ipe_padrao?: number | null
          descricao?: string | null
          dimensao: string
          esforco?: string | null
          id?: string
          prazo_meses?: number | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          arquetipo_id?: string | null
          created_at?: string
          delta_ipe_padrao?: number | null
          descricao?: string | null
          dimensao?: string
          esforco?: string | null
          id?: string
          prazo_meses?: number | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_initiative_library_arquetipo_id_fkey"
            columns: ["arquetipo_id"]
            isOneToOne: false
            referencedRelation: "equity_archetypes"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_initiatives: {
        Row: {
          assessment_id: string
          created_at: string
          delta_ipe: number | null
          delta_valor: number | null
          dependencias: string[] | null
          descricao: string | null
          dimensao_alvo: string
          esforco: string | null
          id: string
          prazo_meses: number | null
          prioridade: number | null
          sprint: number | null
          status: string
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          delta_ipe?: number | null
          delta_valor?: number | null
          dependencias?: string[] | null
          descricao?: string | null
          dimensao_alvo: string
          esforco?: string | null
          id?: string
          prazo_meses?: number | null
          prioridade?: number | null
          sprint?: number | null
          status?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          delta_ipe?: number | null
          delta_valor?: number | null
          dependencias?: string[] | null
          descricao?: string | null
          dimensao_alvo?: string
          esforco?: string | null
          id?: string
          prazo_meses?: number | null
          prioridade?: number | null
          sprint?: number | null
          status?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_initiatives_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_progress_log: {
        Row: {
          arquetipo_id: string | null
          assessment_id: string | null
          company_id: string
          created_at: string
          dim_snapshot: Json | null
          evento: string | null
          id: string
          ipe: number | null
          top_destruidores: Json | null
          valor: number | null
          valor_alvo: number | null
          veredito_liquidez: string | null
        }
        Insert: {
          arquetipo_id?: string | null
          assessment_id?: string | null
          company_id: string
          created_at?: string
          dim_snapshot?: Json | null
          evento?: string | null
          id?: string
          ipe?: number | null
          top_destruidores?: Json | null
          valor?: number | null
          valor_alvo?: number | null
          veredito_liquidez?: string | null
        }
        Update: {
          arquetipo_id?: string | null
          assessment_id?: string | null
          company_id?: string
          created_at?: string
          dim_snapshot?: Json | null
          evento?: string | null
          id?: string
          ipe?: number | null
          top_destruidores?: Json | null
          valor?: number | null
          valor_alvo?: number | null
          veredito_liquidez?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_progress_log_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_progress_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "equity_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_valuations: {
        Row: {
          addbacks: Json | null
          assessment_id: string
          created_at: string
          dcf_premissas: Json | null
          ebitda_contabil: number | null
          ebitda_normalizado: number | null
          faixa_max: number | null
          faixa_min: number | null
          id: string
          metodo: string
          multiplo_aplicado: number | null
          premissas: Json | null
          valor_alvo: number | null
          valor_atual: number | null
          valor_dcf: number | null
          valor_sde: number | null
          valor_triangulado: number | null
        }
        Insert: {
          addbacks?: Json | null
          assessment_id: string
          created_at?: string
          dcf_premissas?: Json | null
          ebitda_contabil?: number | null
          ebitda_normalizado?: number | null
          faixa_max?: number | null
          faixa_min?: number | null
          id?: string
          metodo?: string
          multiplo_aplicado?: number | null
          premissas?: Json | null
          valor_alvo?: number | null
          valor_atual?: number | null
          valor_dcf?: number | null
          valor_sde?: number | null
          valor_triangulado?: number | null
        }
        Update: {
          addbacks?: Json | null
          assessment_id?: string
          created_at?: string
          dcf_premissas?: Json | null
          ebitda_contabil?: number | null
          ebitda_normalizado?: number | null
          faixa_max?: number | null
          faixa_min?: number | null
          id?: string
          metodo?: string
          multiplo_aplicado?: number | null
          premissas?: Json | null
          valor_alvo?: number | null
          valor_atual?: number | null
          valor_dcf?: number | null
          valor_sde?: number | null
          valor_triangulado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_valuations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "equity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_value_bridge_items: {
        Row: {
          created_at: string
          delta_valor: number
          descricao: string | null
          id: string
          iniciativa_ids: string[] | null
          ordem: number | null
          parcela: string
          valuation_id: string
        }
        Insert: {
          created_at?: string
          delta_valor?: number
          descricao?: string | null
          id?: string
          iniciativa_ids?: string[] | null
          ordem?: number | null
          parcela: string
          valuation_id: string
        }
        Update: {
          created_at?: string
          delta_valor?: number
          descricao?: string | null
          id?: string
          iniciativa_ids?: string[] | null
          ordem?: number | null
          parcela?: string
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_value_bridge_items_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "equity_valuations"
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
      internal_signatures: {
        Row: {
          created_at: string
          document_id: string
          expires_at: string
          final_pdf_path: string | null
          id: string
          ip: unknown
          requested_at: string
          requested_by: string | null
          sign_token: string
          signature_hash: string | null
          signature_image_path: string | null
          signed_at: string | null
          signer_email: string
          signer_name: string
          signer_role: string
          signer_user_id: string | null
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          expires_at?: string
          final_pdf_path?: string | null
          id?: string
          ip?: unknown
          requested_at?: string
          requested_by?: string | null
          sign_token?: string
          signature_hash?: string | null
          signature_image_path?: string | null
          signed_at?: string | null
          signer_email: string
          signer_name: string
          signer_role: string
          signer_user_id?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          expires_at?: string
          final_pdf_path?: string | null
          id?: string
          ip?: unknown
          requested_at?: string
          requested_by?: string | null
          sign_token?: string
          signature_hash?: string | null
          signature_image_path?: string | null
          signed_at?: string | null
          signer_email?: string
          signer_name?: string
          signer_role?: string
          signer_user_id?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "deal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_sim_attempts: {
        Row: {
          abandoned: boolean
          answers: Json
          classification: string | null
          complete_count: number
          completed_at: string | null
          created_at: string
          id: string
          noinfo_count: number
          partial_count: number
          score: number
          score_final: number
          total_questions: number
          user_id: string
        }
        Insert: {
          abandoned?: boolean
          answers?: Json
          classification?: string | null
          complete_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          noinfo_count?: number
          partial_count?: number
          score?: number
          score_final?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          abandoned?: boolean
          answers?: Json
          classification?: string | null
          complete_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          noinfo_count?: number
          partial_count?: number
          score?: number
          score_final?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      legal_homologations: {
        Row: {
          access_token: string
          comments: string | null
          created_at: string
          decided_at: string | null
          decision: string | null
          document_id: string
          expires_at: string
          id: string
          lawyer_email: string
          lawyer_name: string
          sent_at: string
          sent_by: string | null
          viewed_at: string | null
        }
        Insert: {
          access_token?: string
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          document_id: string
          expires_at?: string
          id?: string
          lawyer_email: string
          lawyer_name: string
          sent_at?: string
          sent_by?: string | null
          viewed_at?: string | null
        }
        Update: {
          access_token?: string
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          document_id?: string
          expires_at?: string
          id?: string
          lawyer_email?: string
          lawyer_name?: string
          sent_at?: string
          sent_by?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_homologations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "deal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_batch_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          page_number: number
          prospect_contact_id: string | null
          snapshot: Json
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          page_number: number
          prospect_contact_id?: string | null
          snapshot: Json
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          page_number?: number
          prospect_contact_id?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "letter_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "letter_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_batches: {
        Row: {
          advisor_id: string
          created_at: string
          csv_storage_path: string | null
          email_message_id: string | null
          error_message: string | null
          grafica_email: string | null
          id: string
          pdf_storage_path: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          total_contacts: number
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          csv_storage_path?: string | null
          email_message_id?: string | null
          error_message?: string | null
          grafica_email?: string | null
          id?: string
          pdf_storage_path?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          total_contacts?: number
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          csv_storage_path?: string | null
          email_message_id?: string | null
          error_message?: string | null
          grafica_email?: string | null
          id?: string
          pdf_storage_path?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          total_contacts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "letter_batches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "letter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          signature_html: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          signature_html?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          signature_html?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      listing_financial_docs: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          doc_type: string
          equity_score: Json | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          listing_id: string
          source_doc_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          doc_type?: string
          equity_score?: Json | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          listing_id: string
          source_doc_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          doc_type?: string
          equity_score?: Json | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          listing_id?: string
          source_doc_id?: string | null
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
      mari_leads: {
        Row: {
          cidade: string | null
          cnae: string | null
          cnpj: string
          created_at: string
          id: string
          listing_id: string | null
          porte: string | null
          razao_social: string | null
          status: string
          uf: string | null
          updated_at: string
          user_id: string
          window_base: number | null
        }
        Insert: {
          cidade?: string | null
          cnae?: string | null
          cnpj: string
          created_at?: string
          id?: string
          listing_id?: string | null
          porte?: string | null
          razao_social?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
          user_id: string
          window_base?: number | null
        }
        Update: {
          cidade?: string | null
          cnae?: string | null
          cnpj?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          porte?: string | null
          razao_social?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
          user_id?: string
          window_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mari_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mari_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_blind"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mari_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunity_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mari_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_listings"
            referencedColumns: ["id"]
          },
        ]
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
      nbo_drafts: {
        Row: {
          created_at: string
          created_by: string | null
          current_step: number
          deal_pair_id: string
          id: string
          last_saved_at: string
          payload: Json
          template_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_step?: number
          deal_pair_id: string
          id?: string
          last_saved_at?: string
          payload?: Json
          template_code?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_step?: number
          deal_pair_id?: string
          id?: string
          last_saved_at?: string
          payload?: Json
          template_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "nbo_drafts_deal_pair_id_fkey"
            columns: ["deal_pair_id"]
            isOneToOne: false
            referencedRelation: "deal_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nbo_drafts_deal_pair_id_fkey"
            columns: ["deal_pair_id"]
            isOneToOne: false
            referencedRelation: "deal_pairs_enriched"
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
      planos_perfeitos: {
        Row: {
          created_at: string
          id: string
          investimento_mensal: number | null
          lead_tag: string
          plano_inputs: Json
          result: Json
          updated_at: string
          user_id: string
          valuation_atual: number | null
          valuation_inputs: Json
          valuation_meta: number | null
          viabilidade: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          investimento_mensal?: number | null
          lead_tag?: string
          plano_inputs: Json
          result: Json
          updated_at?: string
          user_id: string
          valuation_atual?: number | null
          valuation_inputs: Json
          valuation_meta?: number | null
          viabilidade?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          investimento_mensal?: number | null
          lead_tag?: string
          plano_inputs?: Json
          result?: Json
          updated_at?: string
          user_id?: string
          valuation_atual?: number | null
          valuation_inputs?: Json
          valuation_meta?: number | null
          viabilidade?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cep: string | null
          city: string | null
          company_name: string | null
          cpf_cnpj: string | null
          created_at: string
          full_name: string | null
          id: string
          interests: string[] | null
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
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cep?: string | null
          city?: string | null
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[] | null
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
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cep?: string | null
          city?: string | null
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[] | null
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
          website_url?: string | null
        }
        Relationships: []
      }
      prospect_contacts: {
        Row: {
          city: string
          cnpj: string | null
          company_name: string
          contact_first_name: string | null
          contact_name: string
          converted_at: string | null
          converted_to_mandate_id: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          next_followup_at: string | null
          notes: string | null
          owner_advisor_id: string
          phone: string | null
          postal_address: string | null
          postal_zipcode: string | null
          sector: string
          side: string
          source: string
          source_notes: string | null
          state: string
          status: string
          tags: string[]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          city: string
          cnpj?: string | null
          company_name: string
          contact_first_name?: string | null
          contact_name: string
          converted_at?: string | null
          converted_to_mandate_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          owner_advisor_id: string
          phone?: string | null
          postal_address?: string | null
          postal_zipcode?: string | null
          sector: string
          side: string
          source?: string
          source_notes?: string | null
          state: string
          status?: string
          tags?: string[]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          city?: string
          cnpj?: string | null
          company_name?: string
          contact_first_name?: string | null
          contact_name?: string
          converted_at?: string | null
          converted_to_mandate_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          owner_advisor_id?: string
          phone?: string | null
          postal_address?: string | null
          postal_zipcode?: string | null
          sector?: string
          side?: string
          source?: string
          source_notes?: string | null
          state?: string
          status?: string
          tags?: string[]
          updated_at?: string
          whatsapp?: string | null
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
      sector_market_trends: {
        Row: {
          ano: number
          num_deals: number
          segment: string
          tendencia: string
          volume_m: number
        }
        Insert: {
          ano: number
          num_deals: number
          segment: string
          tendencia: string
          volume_m: number
        }
        Update: {
          ano?: number
          num_deals?: number
          segment?: string
          tendencia?: string
          volume_m?: number
        }
        Relationships: []
      }
      stage_doc_requirements: {
        Row: {
          created_at: string
          id: string
          is_blocking: boolean
          is_required: boolean
          position: number
          stage_key: string
          template_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_blocking?: boolean
          is_required?: boolean
          position?: number
          stage_key: string
          template_code: string
        }
        Update: {
          created_at?: string
          id?: string
          is_blocking?: boolean
          is_required?: boolean
          position?: number
          stage_key?: string
          template_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_doc_requirements_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "doc_templates"
            referencedColumns: ["code"]
          },
        ]
      }
      stage_task_templates: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_blocking: boolean
          is_required: boolean
          label: string
          position: number
          stage_key: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_blocking?: boolean
          is_required?: boolean
          label: string
          position?: number
          stage_key: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_blocking?: boolean
          is_required?: boolean
          label?: string
          position?: number
          stage_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      stage_tasks: {
        Row: {
          created_at: string
          deal_id: string
          done_at: string | null
          done_by: string | null
          due_at: string | null
          id: string
          is_blocking: boolean
          is_required: boolean
          label: string
          note: string | null
          stage_key: string
          status: string
          template_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          done_at?: string | null
          done_by?: string | null
          due_at?: string | null
          id?: string
          is_blocking?: boolean
          is_required?: boolean
          label: string
          note?: string | null
          stage_key: string
          status?: string
          template_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          done_at?: string | null
          done_by?: string | null
          due_at?: string | null
          id?: string
          is_blocking?: boolean
          is_required?: boolean
          label?: string
          note?: string | null
          stage_key?: string
          status?: string
          template_code?: string
          updated_at?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      vertical_imports: {
        Row: {
          category: string | null
          cnae: string | null
          cnpj: string
          data_corte: string | null
          id: string
          imported_at: string
          imported_by: string | null
          metric_1: number | null
          metric_2: number | null
          municipio: string | null
          promoted_at: string | null
          promoted_company_cnpj: string | null
          raw: Json | null
          razao_social: string | null
          source_url: string | null
          uf: string | null
          vertical_slug: string
        }
        Insert: {
          category?: string | null
          cnae?: string | null
          cnpj: string
          data_corte?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          metric_1?: number | null
          metric_2?: number | null
          municipio?: string | null
          promoted_at?: string | null
          promoted_company_cnpj?: string | null
          raw?: Json | null
          razao_social?: string | null
          source_url?: string | null
          uf?: string | null
          vertical_slug: string
        }
        Update: {
          category?: string | null
          cnae?: string | null
          cnpj?: string
          data_corte?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          metric_1?: number | null
          metric_2?: number | null
          municipio?: string | null
          promoted_at?: string | null
          promoted_company_cnpj?: string | null
          raw?: Json | null
          razao_social?: string | null
          source_url?: string | null
          uf?: string | null
          vertical_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_imports_vertical_slug_fkey"
            columns: ["vertical_slug"]
            isOneToOne: false
            referencedRelation: "vertical_registry"
            referencedColumns: ["slug"]
          },
        ]
      }
      vertical_registry: {
        Row: {
          active: boolean
          cnae_prefixes: string[]
          color: string
          created_at: string
          icon: string
          label: string
          market_page_path: string | null
          metric_1_label: string | null
          metric_1_unit: string | null
          metric_2_label: string | null
          metric_2_unit: string | null
          position: number
          short_description: string | null
          slug: string
          source_name: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cnae_prefixes?: string[]
          color?: string
          created_at?: string
          icon?: string
          label: string
          market_page_path?: string | null
          metric_1_label?: string | null
          metric_1_unit?: string | null
          metric_2_label?: string | null
          metric_2_unit?: string | null
          position?: number
          short_description?: string | null
          slug: string
          source_name?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cnae_prefixes?: string[]
          color?: string
          created_at?: string
          icon?: string
          label?: string
          market_page_path?: string | null
          metric_1_label?: string | null
          metric_1_unit?: string | null
          metric_2_label?: string | null
          metric_2_unit?: string | null
          position?: number
          short_description?: string | null
          slug?: string
          source_name?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          advisor_id: string
          contact_id: string | null
          content_text: string | null
          direction: string
          id: string
          intent: string | null
          mandate_id: string | null
          media_caption: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string
          meta_message_id: string | null
          meta_message_timestamp: string | null
          phone_from: string
          phone_to: string
          processed_at: string | null
          processing_error: string | null
          raw_payload: Json | null
          received_at: string
          sentiment: string | null
          status: string
        }
        Insert: {
          advisor_id: string
          contact_id?: string | null
          content_text?: string | null
          direction: string
          id?: string
          intent?: string | null
          mandate_id?: string | null
          media_caption?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          meta_message_timestamp?: string | null
          phone_from: string
          phone_to: string
          processed_at?: string | null
          processing_error?: string | null
          raw_payload?: Json | null
          received_at?: string
          sentiment?: string | null
          status?: string
        }
        Update: {
          advisor_id?: string
          contact_id?: string | null
          content_text?: string | null
          direction?: string
          id?: string
          intent?: string | null
          mandate_id?: string | null
          media_caption?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          meta_message_timestamp?: string | null
          phone_from?: string
          phone_to?: string
          processed_at?: string | null
          processing_error?: string | null
          raw_payload?: Json | null
          received_at?: string
          sentiment?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      api_usage_daily_by_provider: {
        Row: {
          calls: number | null
          cost_brl: number | null
          cost_usd: number | null
          day: string | null
          errors: number | null
          provider: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Relationships: []
      }
      api_usage_daily_summary: {
        Row: {
          avg_latency_ms: number | null
          calls: number | null
          category: string | null
          cost_brl: number | null
          cost_usd: number | null
          day: string | null
          error_rate_pct: number | null
          errors: number | null
          function_name: string | null
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          provider: string | null
          total_tokens: number | null
        }
        Relationships: []
      }
      buyer_deal_room: {
        Row: {
          access_level: string | null
          buyer_user_id: string | null
          can_view_identity: boolean | null
          cnpj: string | null
          deal_created_at: string | null
          deal_id: string | null
          deal_last_moved_at: string | null
          granted_at: string | null
          nda_signed: boolean | null
          outcome: string | null
          stage: string | null
        }
        Relationships: []
      }
      buyer_revealed_thetas: {
        Row: {
          buyer_id: string | null
          feature_name: string | null
          last_updated: string | null
          n_observations: number | null
          posterior_mean: number | null
          posterior_std: number | null
        }
        Insert: {
          buyer_id?: string | null
          feature_name?: string | null
          last_updated?: string | null
          n_observations?: number | null
          posterior_mean?: number | null
          posterior_std?: number | null
        }
        Update: {
          buyer_id?: string | null
          feature_name?: string | null
          last_updated?: string | null
          n_observations?: number | null
          posterior_mean?: number | null
          posterior_std?: number | null
        }
        Relationships: []
      }
      deal_doc_progress: {
        Row: {
          deal_id: string | null
          pending_blocking: number | null
          present_count: number | null
          required_count: number | null
          stage_key: string | null
        }
        Relationships: []
      }
      deal_pairs_enriched: {
        Row: {
          buy_cnpj: string | null
          buy_mandate_id: string | null
          buy_setor: string | null
          buy_uf: string | null
          buyer_profile_company: string | null
          buyer_profile_id: string | null
          buyer_profile_name: string | null
          comissao_buy_pct: number | null
          comissao_sell_pct: number | null
          created_at: string | null
          created_by: string | null
          data_pareamento: string | null
          id: string | null
          lost_reason: string | null
          notes: string | null
          responsavel_advisor_id: string | null
          responsavel_name: string | null
          sell_cnpj: string | null
          sell_mandate_id: string | null
          sell_setor: string | null
          sell_stage:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          sell_uf: string | null
          source_match_id: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      deal_sla_report: {
        Row: {
          actual_days: number | null
          actual_hours_calc: number | null
          baseline_days: number | null
          baseline_hours: number | null
          delta_target_days: number | null
          delta_target_hours: number | null
          exit_reason: string | null
          from_stage: string | null
          mandate_id: string | null
          moved_at: string | null
          moved_by: string | null
          responsible_user_id: string | null
          target_days: number | null
          target_hours: number | null
          time_in_previous_stage_seconds: number | null
          to_stage: string | null
          transition_id: string | null
        }
        Relationships: []
      }
      deal_stage_progress: {
        Row: {
          deal_id: string | null
          done: number | null
          pct_done: number | null
          pending_blocking: number | null
          stage_key: string | null
          total: number | null
        }
        Relationships: []
      }
      deal_timeline: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          deal_id: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string | null
          payload: Json | null
          source: string | null
        }
        Relationships: []
      }
      eb_access_logs_v: {
        Row: {
          action: string | null
          advisor_name: string | null
          cnpj: string | null
          codename: string | null
          context: string | null
          created_at: string | null
          disclosure_mode: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          razao_social: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
          criterios_exclusao: string | null
          deals_last_12m: number | null
          deals_realizados: number | null
          email_contato_principal: string | null
          embedding: string | null
          embedding_computed_at: string | null
          embedding_text_hash: string | null
          engagement_status:
            | "aguardando"
            | "em_negociacao"
            | "comprou"
            | "descartado"
            | null
          id: string | null
          linkedin_url: string | null
          median_target_size_recent: number | null
          municipios_interesse: string[] | null
          nome: string | null
          notas_estrategicas: string | null
          observacoes: string | null
          pause_signal: boolean | null
          pe_sponsor_entry_date: string | null
          pe_sponsor_name: string | null
          porte_alvo: string[] | null
          primary_contact: Json | null
          prioridade_global: number | null
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
          raw_data: Json | null
          recent_capital_raise_brl: number | null
          recent_capital_raise_date: string | null
          responsavel_id: string | null
          setores_interesse: string[] | null
          sinergias_chave: string[] | null
          source: string | null
          status: string | null
          subsetores_interesse: string[] | null
          telefone_contato: string | null
          tese_text: string | null
          ticket_max: number | null
          ticket_min: number | null
          tipo: string | null
          tipo_comprador:
            | "estrategico_incumbente"
            | "estrategico_entrante"
            | "consolidador"
            | "plataforma_pe"
            | "add_on_pe"
            | "fundo_financeiro"
            | "family_office"
            | "search_fund"
            | "oportunista"
            | "eliminatorio"
            | "internacional"
            | null
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
          criterios_exclusao?: string | null
          deals_last_12m?: number | null
          deals_realizados?: number | null
          email_contato_principal?: string | null
          embedding?: string | null
          embedding_computed_at?: string | null
          embedding_text_hash?: string | null
          engagement_status?:
            | "aguardando"
            | "em_negociacao"
            | "comprou"
            | "descartado"
            | null
          id?: string | null
          linkedin_url?: string | null
          median_target_size_recent?: number | null
          municipios_interesse?: string[] | null
          nome?: string | null
          notas_estrategicas?: string | null
          observacoes?: string | null
          pause_signal?: boolean | null
          pe_sponsor_entry_date?: string | null
          pe_sponsor_name?: string | null
          porte_alvo?: string[] | null
          primary_contact?: never
          prioridade_global?: number | null
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
          raw_data?: Json | null
          recent_capital_raise_brl?: number | null
          recent_capital_raise_date?: string | null
          responsavel_id?: string | null
          setores_interesse?: string[] | null
          sinergias_chave?: string[] | null
          source?: string | null
          status?: string | null
          subsetores_interesse?: string[] | null
          telefone_contato?: string | null
          tese_text?: string | null
          ticket_max?: number | null
          ticket_min?: number | null
          tipo?: string | null
          tipo_comprador?:
            | "estrategico_incumbente"
            | "estrategico_entrante"
            | "consolidador"
            | "plataforma_pe"
            | "add_on_pe"
            | "fundo_financeiro"
            | "family_office"
            | "search_fund"
            | "oportunista"
            | "eliminatorio"
            | "internacional"
            | null
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
          criterios_exclusao?: string | null
          deals_last_12m?: number | null
          deals_realizados?: number | null
          email_contato_principal?: string | null
          embedding?: string | null
          embedding_computed_at?: string | null
          embedding_text_hash?: string | null
          engagement_status?:
            | "aguardando"
            | "em_negociacao"
            | "comprou"
            | "descartado"
            | null
          id?: string | null
          linkedin_url?: string | null
          median_target_size_recent?: number | null
          municipios_interesse?: string[] | null
          nome?: string | null
          notas_estrategicas?: string | null
          observacoes?: string | null
          pause_signal?: boolean | null
          pe_sponsor_entry_date?: string | null
          pe_sponsor_name?: string | null
          porte_alvo?: string[] | null
          primary_contact?: never
          prioridade_global?: number | null
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
          raw_data?: Json | null
          recent_capital_raise_brl?: number | null
          recent_capital_raise_date?: string | null
          responsavel_id?: string | null
          setores_interesse?: string[] | null
          sinergias_chave?: string[] | null
          source?: string | null
          status?: string | null
          subsetores_interesse?: string[] | null
          telefone_contato?: string | null
          tese_text?: string | null
          ticket_max?: number | null
          ticket_min?: number | null
          tipo?: string | null
          tipo_comprador?:
            | "estrategico_incumbente"
            | "estrategico_entrante"
            | "consolidador"
            | "plataforma_pe"
            | "add_on_pe"
            | "fundo_financeiro"
            | "family_office"
            | "search_fund"
            | "oportunista"
            | "eliminatorio"
            | "internacional"
            | null
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
      eb_contact_last_letter: {
        Row: {
          advisor_id: string | null
          batch_id: string | null
          batch_status: string | null
          contact_id: string | null
          sent_at: string | null
          template_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letter_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "letter_batches"
            referencedColumns: ["id"]
          },
        ]
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
      eb_entity_note_mentions: {
        Row: {
          author_id: string | null
          body_preview: string | null
          created_at: string | null
          id: string | null
          note_id: string | null
          note_updated_at: string | null
          pinned: boolean | null
          source_entity_id: string | null
          source_entity_type: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          title: string | null
          visibility: string | null
        }
        Relationships: []
      }
      eb_entity_notes: {
        Row: {
          author_id: string | null
          body_md: string | null
          created_at: string | null
          embedding_computed_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          pinned: boolean | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_id?: string | null
          body_md?: string | null
          created_at?: string | null
          embedding_computed_at?: string | null
          entity_id?: string | null
          entity_type?: never
          id?: string | null
          pinned?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          visibility?: never
        }
        Update: {
          author_id?: string | null
          body_md?: string | null
          created_at?: string | null
          embedding_computed_at?: string | null
          entity_id?: string | null
          entity_type?: never
          id?: string | null
          pinned?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          visibility?: never
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
      eb_my_companies_v2: {
        Row: {
          cnpj: string | null
          co_advisor_ids: string[] | null
          codename: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          deal_confidence: string | null
          deal_kind: string | null
          deal_origin: string | null
          mandate_id: string | null
          my_role: string | null
          needs_enrichment: boolean | null
          origin_advisor_id: string | null
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
          updated_at: string | null
          valor_operacao: number | null
          valor_pedido: number | null
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
      eb_unassigned_mandates: {
        Row: {
          cnpj: string | null
          codename: string | null
          company_name: string | null
          created_at: string | null
          deal_confidence: string | null
          deal_kind: string | null
          deal_origin: string | null
          mandate_id: string | null
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
          setor: string | null
          stage_changed_at: string | null
          uf: string | null
          valor_operacao: number | null
          valor_pedido: number | null
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
      eb_v_mandate_pins: {
        Row: {
          company_cnpj: string | null
          fase:
            | "match"
            | "nbo"
            | "due_diligence"
            | "spa"
            | "closing"
            | "closed"
            | null
          id: string | null
          latitude: number | null
          longitude: number | null
          municipio: string | null
          razao_social: string | null
          status: string | null
          uf: string | null
        }
        Relationships: []
      }
      eb_v_mandates_full: {
        Row: {
          bdr_id: string | null
          closer_id: string | null
          codename: string | null
          comissao_pct: number | null
          commission_pct: number | null
          company_cnpj: string | null
          comprador_cnpj: string | null
          comprador_nome: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          data_assinatura: string | null
          data_fechamento: string | null
          data_inicio: string | null
          data_vencimento: string | null
          deal_kind: string | null
          deal_phase: string | null
          deal_type: string | null
          exclusividade: boolean | null
          faturamento_vispe: number | null
          id: string | null
          match_buyer_id: string | null
          nome_fantasia: string | null
          outcome: string | null
          pipeline_stage: string | null
          razao_social: string | null
          regiao: string | null
          responsavel_id: string | null
          setor: string | null
          stage_changed_at: string | null
          status: string | null
          uf: string | null
          updated_at: string | null
          valor_operacao: number | null
          valor_pedido: number | null
        }
        Relationships: []
      }
      eb_vertical_company_stats: {
        Row: {
          category: string | null
          cnae: string | null
          cnpj: string | null
          data_corte: string | null
          id: string | null
          metric_1: number | null
          metric_2: number | null
          municipio: string | null
          promoted: boolean | null
          promoted_at: string | null
          rank_global: number | null
          rank_uf: number | null
          razao_social: string | null
          source_url: string | null
          uf: string | null
          vertical_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vertical_imports_vertical_slug_fkey"
            columns: ["vertical_slug"]
            isOneToOne: false
            referencedRelation: "vertical_registry"
            referencedColumns: ["slug"]
          },
        ]
      }
      eb_vertical_uf_summary: {
        Row: {
          last_data_corte: string | null
          metric_1_avg: number | null
          metric_1_sum: number | null
          metric_2_sum: number | null
          n_cities: number | null
          n_companies: number | null
          n_promoted: number | null
          uf: string | null
          vertical_label: string | null
          vertical_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vertical_imports_vertical_slug_fkey"
            columns: ["vertical_slug"]
            isOneToOne: false
            referencedRelation: "vertical_registry"
            referencedColumns: ["slug"]
          },
        ]
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
      mari_insights: {
        Row: {
          acted_at: string | null
          action_payload: Json | null
          advisor_id: string | null
          buyer_id: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string | null
          insight_type: string | null
          mandate_id: string | null
          message: string | null
          priority: number | null
          status: string | null
          suggested_action: string | null
          trigger_rule: string | null
          updated_at: string | null
        }
        Insert: {
          acted_at?: string | null
          action_payload?: Json | null
          advisor_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string | null
          insight_type?: string | null
          mandate_id?: string | null
          message?: string | null
          priority?: number | null
          status?: string | null
          suggested_action?: string | null
          trigger_rule?: string | null
          updated_at?: string | null
        }
        Update: {
          acted_at?: string | null
          action_payload?: Json | null
          advisor_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string | null
          insight_type?: string | null
          mandate_id?: string | null
          message?: string | null
          priority?: number | null
          status?: string | null
          suggested_action?: string | null
          trigger_rule?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          abstain: boolean | null
          abstain_reason: string | null
          ai_confidence: number | null
          ai_pitch: string | null
          ai_thesis_summary: string | null
          assigned_bdr: string | null
          buyer_archetype: string | null
          buyer_id: string | null
          cnpj: string | null
          comparables: Json | null
          computed_at: string | null
          counterfactual: string | null
          data_confidence: number | null
          engine_version: string | null
          ev_p10: number | null
          ev_p50: number | null
          ev_p90: number | null
          feature_contributions: Json | null
          geografia_fit: number | null
          id: string | null
          is_cold_suggestion: boolean | null
          is_current: boolean | null
          ma_score_emp: number | null
          match_score: number | null
          multiple_p10: number | null
          multiple_p50: number | null
          multiple_p90: number | null
          p_close_12m: number | null
          p_close_ci_lower: number | null
          p_close_ci_upper: number | null
          porte_fit: number | null
          price_per_client_p50: number | null
          prioridade: number | null
          reasons: Json | null
          sav_breakdown: Json | null
          sav_calculated_at: string | null
          sav_score: number | null
          sector_cycle_phase: number | null
          setor_fit: number | null
          status: string | null
          tese_fit: number | null
          thesis_generated_at: string | null
          thesis_key: string | null
          thesis_text: string | null
        }
        Insert: {
          abstain?: boolean | null
          abstain_reason?: string | null
          ai_confidence?: number | null
          ai_pitch?: string | null
          ai_thesis_summary?: string | null
          assigned_bdr?: string | null
          buyer_archetype?: string | null
          buyer_id?: string | null
          cnpj?: string | null
          comparables?: Json | null
          computed_at?: string | null
          counterfactual?: string | null
          data_confidence?: number | null
          engine_version?: string | null
          ev_p10?: number | null
          ev_p50?: number | null
          ev_p90?: number | null
          feature_contributions?: Json | null
          geografia_fit?: number | null
          id?: string | null
          is_cold_suggestion?: boolean | null
          is_current?: boolean | null
          ma_score_emp?: number | null
          match_score?: number | null
          multiple_p10?: number | null
          multiple_p50?: number | null
          multiple_p90?: number | null
          p_close_12m?: number | null
          p_close_ci_lower?: number | null
          p_close_ci_upper?: number | null
          porte_fit?: number | null
          price_per_client_p50?: number | null
          prioridade?: number | null
          reasons?: Json | null
          sav_breakdown?: Json | null
          sav_calculated_at?: string | null
          sav_score?: number | null
          sector_cycle_phase?: number | null
          setor_fit?: number | null
          status?: string | null
          tese_fit?: number | null
          thesis_generated_at?: string | null
          thesis_key?: string | null
          thesis_text?: string | null
        }
        Update: {
          abstain?: boolean | null
          abstain_reason?: string | null
          ai_confidence?: number | null
          ai_pitch?: string | null
          ai_thesis_summary?: string | null
          assigned_bdr?: string | null
          buyer_archetype?: string | null
          buyer_id?: string | null
          cnpj?: string | null
          comparables?: Json | null
          computed_at?: string | null
          counterfactual?: string | null
          data_confidence?: number | null
          engine_version?: string | null
          ev_p10?: number | null
          ev_p50?: number | null
          ev_p90?: number | null
          feature_contributions?: Json | null
          geografia_fit?: number | null
          id?: string | null
          is_cold_suggestion?: boolean | null
          is_current?: boolean | null
          ma_score_emp?: number | null
          match_score?: number | null
          multiple_p10?: number | null
          multiple_p50?: number | null
          multiple_p90?: number | null
          p_close_12m?: number | null
          p_close_ci_lower?: number | null
          p_close_ci_upper?: number | null
          porte_fit?: number | null
          price_per_client_p50?: number | null
          prioridade?: number | null
          reasons?: Json | null
          sav_breakdown?: Json | null
          sav_calculated_at?: string | null
          sav_score?: number | null
          sector_cycle_phase?: number | null
          setor_fit?: number | null
          status?: string | null
          tese_fit?: number | null
          thesis_generated_at?: string | null
          thesis_key?: string | null
          thesis_text?: string | null
        }
        Relationships: []
      }
      mv_dashboard_executivo: {
        Row: {
          buyside: number | null
          canceladas: number | null
          concluidas: number | null
          em_andamento: number | null
          faturamento_vispe: number | null
          refreshed_at: string | null
          sellside: number | null
          ticket_medio: number | null
          total_operacoes: number | null
          valor_total_operacoes: number | null
        }
        Relationships: []
      }
      mv_dashboard_match: {
        Row: {
          cancelados: number | null
          concluidos: number | null
          em_andamento: number | null
          refreshed_at: string | null
          tempo_medio_dias: number | null
          total: number | null
        }
        Relationships: []
      }
      mv_dashboard_nbo: {
        Row: {
          cancelados: number | null
          comissoes_total: number | null
          concluidos: number | null
          em_andamento: number | null
          refreshed_at: string | null
          tempo_medio_dias: number | null
          ticket_medio: number | null
          total: number | null
          valor_medio: number | null
          valor_total: number | null
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
      v_analytics_browsers: {
        Row: {
          browser: string | null
          sessions: number | null
        }
        Relationships: []
      }
      v_analytics_cta: {
        Row: {
          clicks: number | null
          cta: string | null
          unique_sessions: number | null
        }
        Relationships: []
      }
      v_analytics_daily: {
        Row: {
          day: string | null
          leads: number | null
          page_views: number | null
          sessions: number | null
          signups: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      v_analytics_devices: {
        Row: {
          device: string | null
          sessions: number | null
        }
        Relationships: []
      }
      v_analytics_exit_pages: {
        Row: {
          exits: number | null
          path: string | null
        }
        Relationships: []
      }
      v_analytics_funnel: {
        Row: {
          leads: number | null
          sessions: number | null
          sessions_over_30s: number | null
          sessions_with_pv: number | null
          signups: number | null
        }
        Relationships: []
      }
      v_analytics_hourly_heatmap: {
        Row: {
          dow: number | null
          events: number | null
          hour: number | null
        }
        Relationships: []
      }
      v_analytics_new_visitor_conversion: {
        Row: {
          became_authenticated: number | null
          leads: number | null
          new_visitors: number | null
          signups: number | null
        }
        Relationships: []
      }
      v_analytics_new_vs_returning: {
        Row: {
          new_visitors: number | null
          returning_visitors: number | null
          total_visitors: number | null
          window_days: number | null
        }
        Relationships: []
      }
      v_analytics_retention: {
        Row: {
          cohort: number | null
          d1_pct: number | null
          d7_pct: number | null
        }
        Relationships: []
      }
      v_analytics_sources_split: {
        Row: {
          authenticated_visitors: number | null
          leads_new: number | null
          new_visitors: number | null
          returning_visitors: number | null
          sessions_new: number | null
          sessions_returning: number | null
          signups_new: number | null
          source: string | null
        }
        Relationships: []
      }
      v_analytics_top_pages: {
        Row: {
          avg_duration_ms: number | null
          path: string | null
          total_duration_ms: number | null
          unique_sessions: number | null
          views: number | null
        }
        Relationships: []
      }
      v_analytics_traffic_sources: {
        Row: {
          authenticated_sessions: number | null
          sessions: number | null
          source: string | null
        }
        Relationships: []
      }
      v_analytics_user_growth: {
        Row: {
          cumulative_users: number | null
          day: string | null
          new_users: number | null
        }
        Relationships: []
      }
      v_analytics_visitors_daily: {
        Row: {
          authenticated_visitors: number | null
          day: string | null
          new_visitors: number | null
          returning_visitors: number | null
          sessions: number | null
          total_visitors: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _notify_staff_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      approve_advisor_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      approve_franchisee_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      bootstrap_cron_secrets_internal: {
        Args: { _anon_key: string; _service_role_key: string }
        Returns: undefined
      }
      buyer_has_active_access: {
        Args: { p_deal_id: string; p_user_id: string }
        Returns: boolean
      }
      buyer_has_signed_nda: { Args: { p_deal_id: string }; Returns: boolean }
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
      can_advance_stage: {
        Args: { _deal_id: string; _from_stage: string }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_deal_pair_from_match: {
        Args: {
          _buy_mandate_id?: string
          _buyer_profile_id?: string
          _comissao_buy?: number
          _comissao_sell?: number
          _notes?: string
          _sell_mandate_id: string
          _source_match_id?: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      eb_ai_runs_by_date: {
        Args: { p_date: string }
        Returns: {
          buyer_id: string
          cnpj: string
          created_at: string
          error_message: string
          function_name: string
          id: string
          match_id: string
          parsed_output: Json
          status: string
        }[]
      }
      eb_can_view_identity:
        | { Args: { p_cnpj?: string; p_listing?: string }; Returns: boolean }
        | {
            Args: { p_cnpj?: string; p_deal_id?: string; p_listing?: string }
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
      eb_dedupe_audit_recent: {
        Args: { p_limit?: number }
        Returns: {
          entity_type: string
          id: string
          kept_id: string
          merged_at: string
          merged_by: string
          reason: string
          refs_updated: Json
          removed_id: string
        }[]
      }
      eb_dismiss_today_card: {
        Args: {
          p_card_kind: string
          p_reason?: string
          p_ref_id: string
          p_snooze_days?: number
        }
        Returns: string
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
      eb_get_dedupe_stats: { Args: never; Returns: Json }
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
      eb_log_identity_access: {
        Args: {
          p_cnpj?: string
          p_context?: string
          p_disclosure_mode?: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: string
      }
      eb_log_whatsapp_send: {
        Args: {
          p_contact_id: string
          p_mandate_id: string
          p_message_preview?: string
        }
        Returns: string
      }
      eb_mark_whatsapp_action: {
        Args: {
          p_draft_text_sent?: string
          p_log_id: string
          p_marked_action: string
          p_snooze_hours?: number
        }
        Returns: undefined
      }
      eb_match_crosstab: {
        Args: { dim?: string }
        Returns: {
          buyers_count: number
          label: string
          mandates_count: number
        }[]
      }
      eb_notes_by_tag: {
        Args: {
          p_include_descendants?: boolean
          p_limit?: number
          p_tag: string
        }
        Returns: {
          author_id: string | null
          body_md: string | null
          created_at: string | null
          embedding_computed_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          pinned: boolean | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "eb_entity_notes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      eb_notes_search_hybrid: {
        Args: {
          p_entity_type?: string
          p_limit?: number
          p_query: string
          p_query_embedding: string
        }
        Returns: {
          author_id: string
          bm25: number
          body_md: string
          created_at: string
          embedding_computed_at: string
          entity_id: string
          entity_type: string
          id: string
          pinned: boolean
          score: number
          semantic: number
          tags: string[]
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      eb_notes_similar: {
        Args: { p_limit?: number; p_min_similarity?: number; p_note_id: string }
        Returns: {
          author_id: string
          body_md: string
          created_at: string
          embedding_computed_at: string
          entity_id: string
          entity_type: string
          id: string
          pinned: boolean
          similarity: number
          source: string
          tags: string[]
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      eb_open_whatsapp_action: {
        Args: {
          p_buyer_id?: string
          p_contact_id?: string
          p_draft_text_generated: string
          p_draft_type: string
          p_mandate_id?: string
          p_match_id?: string
          p_phone_number: string
          p_source?: string
          p_suggested_action_label?: string
        }
        Returns: string
      }
      eb_read_advisor_token: { Args: { p_secret_id: string }; Returns: string }
      eb_request_disclosure: {
        Args: {
          p_reason?: string
          p_target_cnpj?: string
          p_target_kind: string
          p_target_listing_id?: string
        }
        Returns: string
      }
      eb_resolve_advisor_mapping: {
        Args: { p_monday_name: string; p_user_id: string }
        Returns: Json
      }
      eb_run_safe_dedupe: { Args: { p_entity: string }; Returns: Json }
      eb_store_advisor_token: {
        Args: { p_advisor_id: string; p_token: string }
        Returns: string
      }
      eb_today_cards: {
        Args: { p_limit?: number }
        Returns: {
          card_kind: string
          computed_at: string
          contact_id: string
          contact_name: string
          contact_phone: string
          days_inactive: number
          headline: string
          mandate_codename: string
          mandate_id: string
          mandate_value: number
          match_score: number
          priority_score: number
          ref_id: string
          subline: string
        }[]
      }
      eb_top_tags: {
        Args: { p_author?: string; p_days?: number; p_limit?: number }
        Returns: {
          count: number
          tag: string
        }[]
      }
      eb_upsert_mandate: { Args: { p: Json }; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_old_reservations: { Args: never; Returns: undefined }
      find_user_by_meta_name: { Args: { search_name: string }; Returns: string }
      fn_promote_vertical_lead: {
        Args: { p_import_id: string }
        Returns: string
      }
      get_dashboard_coverage: {
        Args: never
        Returns: {
          empty: number
          field: string
          filled: number
          total: number
        }[]
      }
      get_dashboard_executivo: {
        Args: never
        Returns: Database["public"]["Views"]["mv_dashboard_executivo"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "mv_dashboard_executivo"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_dashboard_mandato: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "mv_dashboard_mandato"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_dashboard_match: {
        Args: never
        Returns: Database["public"]["Views"]["mv_dashboard_match"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "mv_dashboard_match"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_dashboard_nbo: {
        Args: never
        Returns: Database["public"]["Views"]["mv_dashboard_nbo"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "mv_dashboard_nbo"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_health_recent_errors: {
        Args: { limit_n?: number }
        Returns: {
          duration_ms: number
          error_text: string
          function_name: string
          request_id: string
          status: string
          ts: string
        }[]
      }
      get_health_summary_24h: {
        Args: never
        Returns: {
          error_runs: number
          function_name: string
          last_error: string
          last_run_at: string
          ok_runs: number
          p50_ms: number
          p95_ms: number
          status_color: string
          success_rate_pct: number
          total_runs: number
        }[]
      }
      get_sector_for_user: { Args: { _user_id?: string }; Returns: string }
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
      homologation_decide: {
        Args: { p_comments: string; p_decision: string; p_token: string }
        Returns: Json
      }
      homologation_get_by_token: {
        Args: { p_token: string }
        Returns: {
          comments: string
          decided_at: string
          decision: string
          document_body: string
          document_id: string
          document_label: string
          document_template_code: string
          document_version: number
          expires_at: string
          id: string
          lawyer_email: string
          lawyer_name: string
        }[]
      }
      homologation_mark_viewed: {
        Args: { p_token: string }
        Returns: undefined
      }
      increment_capital_view: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      instantiate_stage_tasks: {
        Args: { _deal_id: string; _stage_key: string }
        Returns: number
      }
      log_audit_event: {
        Args: {
          _deal_id: string
          _entity_id: string
          _entity_type: string
          _event_type: string
          _ip?: unknown
          _payload?: Json
          _user_agent?: string
        }
        Returns: string
      }
      mari_ops_health_volume_recent: {
        Args: { p_minutes?: number }
        Returns: number
      }
      mari_ops_record_health: {
        Args: {
          p_duration_ms: number
          p_error_text?: string
          p_function_name: string
          p_payload_summary?: Json
          p_request_id?: string
          p_source?: string
          p_status: string
        }
        Returns: undefined
      }
      mari_ops_record_smoke: {
        Args: {
          p_actual?: Json
          p_duration_ms: number
          p_message?: string
          p_status: string
          p_test_name: string
        }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      profile_completion: { Args: { _user_id: string }; Returns: number }
      promote_assessment_to_mandate: {
        Args: { _assessment_id: string }
        Returns: Json
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_sv: { Args: { p_cnpj: string }; Returns: Json }
      refresh_dashboard_views: { Args: never; Returns: undefined }
      reject_advisor_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      reject_franchisee_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      set_provider_budget: {
        Args: { _provider: string; _usd: number }
        Returns: undefined
      }
      set_provider_enabled: {
        Args: { _enabled: boolean; _provider: string }
        Returns: undefined
      }
      signature_get_by_token: {
        Args: { p_token: string }
        Returns: {
          document_body: string
          document_id: string
          document_label: string
          document_template_code: string
          document_version: number
          expires_at: string
          id: string
          signed_at: string
          signer_email: string
          signer_name: string
          signer_role: string
        }[]
      }
      signature_mark_viewed: { Args: { p_token: string }; Returns: undefined }
      signature_sign: {
        Args: {
          p_ip: unknown
          p_signature_hash: string
          p_signature_image_path: string
          p_token: string
          p_user_agent: string
        }
        Returns: Json
      }
      transition_deal_pair: {
        Args: { _new_status: string; _pair_id: string; _reason?: string }
        Returns: undefined
      }
      update_mandate_field: {
        Args: { p_field: string; p_mandate_id: string; p_value: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "seller"
        | "buyer"
        | "advisor"
        | "admin"
        | "franchisee"
        | "legal"
        | "observer"
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
      app_role: [
        "seller",
        "buyer",
        "advisor",
        "admin",
        "franchisee",
        "legal",
        "observer",
      ],
    },
  },
} as const

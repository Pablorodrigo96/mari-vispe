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
          neighborhood: string | null
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
          neighborhood?: string | null
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
          neighborhood?: string | null
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
    }
    Views: {
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
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
    }
    Enums: {
      app_role: "seller" | "buyer" | "advisor" | "admin"
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
      app_role: ["seller", "buyer", "advisor", "admin"],
    },
  },
} as const

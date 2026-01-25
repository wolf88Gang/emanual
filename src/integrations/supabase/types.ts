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
      asset_photos: {
        Row: {
          asset_id: string
          caption: string | null
          created_at: string
          geo_lat: number | null
          geo_lng: number | null
          id: string
          taken_at: string | null
          url: string
        }
        Insert: {
          asset_id: string
          caption?: string | null
          created_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          taken_at?: string | null
          url: string
        }
        Update: {
          asset_id?: string
          caption?: string | null
          created_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          taken_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_photos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at: string
          critical_care_note: string | null
          description: string | null
          do_not_do_warnings: string | null
          estate_id: string
          id: string
          install_date: string | null
          last_service_date: string | null
          lat: number | null
          lng: number | null
          name: string
          purpose_tags: string[] | null
          risk_flags: string[] | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          critical_care_note?: string | null
          description?: string | null
          do_not_do_warnings?: string | null
          estate_id: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          purpose_tags?: string[] | null
          risk_flags?: string[] | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          critical_care_note?: string | null
          description?: string | null
          do_not_do_warnings?: string | null
          estate_id?: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          purpose_tags?: string[] | null
          risk_flags?: string[] | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          asset_id: string | null
          checkin_at: string
          created_at: string
          estate_id: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          notes: string | null
          photo_url: string | null
          user_id: string
          zone_id: string | null
        }
        Insert: {
          asset_id?: string | null
          checkin_at?: string
          created_at?: string
          estate_id: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          user_id: string
          zone_id?: string | null
        }
        Update: {
          asset_id?: string | null
          checkin_at?: string
          created_at?: string
          estate_id?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          asset_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          estate_id: string
          expiry_date: string | null
          file_url: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          vendor_id: string | null
          zone_id: string | null
        }
        Insert: {
          asset_id?: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          estate_id: string
          expiry_date?: string | null
          file_url: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
          zone_id?: string | null
        }
        Update: {
          asset_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          estate_id?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      estates: {
        Row: {
          address_text: string | null
          boundary_geojson: Json | null
          country: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          org_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          boundary_geojson?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          org_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          boundary_geojson?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          org_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plant_instances: {
        Row: {
          asset_id: string
          created_at: string
          density: string | null
          id: string
          install_date: string | null
          notes: string | null
          plant_profile_id: string | null
          quantity: number | null
          risk_flags: string[] | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          density?: string | null
          id?: string
          install_date?: string | null
          notes?: string | null
          plant_profile_id?: string | null
          quantity?: number | null
          risk_flags?: string[] | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          density?: string | null
          id?: string
          install_date?: string | null
          notes?: string | null
          plant_profile_id?: string | null
          quantity?: number | null
          risk_flags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_instances_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_instances_plant_profile_id_fkey"
            columns: ["plant_profile_id"]
            isOneToOne: false
            referencedRelation: "plant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_profiles: {
        Row: {
          care_template_json: Json | null
          category: Database["public"]["Enums"]["plant_category"] | null
          common_name: string
          created_at: string
          id: string
          image_url: string | null
          native_status: Database["public"]["Enums"]["native_status"] | null
          scientific_name: string | null
          updated_at: string
        }
        Insert: {
          care_template_json?: Json | null
          category?: Database["public"]["Enums"]["plant_category"] | null
          common_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          native_status?: Database["public"]["Enums"]["native_status"] | null
          scientific_name?: string | null
          updated_at?: string
        }
        Update: {
          care_template_json?: Json | null
          category?: Database["public"]["Enums"]["plant_category"] | null
          common_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          native_status?: Database["public"]["Enums"]["native_status"] | null
          scientific_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          org_id: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          org_id?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_labels: {
        Row: {
          asset_id: string
          code: string
          created_at: string
          estate_id: string
          id: string
          label_text: string | null
        }
        Insert: {
          asset_id: string
          code: string
          created_at?: string
          estate_id: string
          id?: string
          label_text?: string | null
        }
        Update: {
          asset_id?: string
          code?: string
          created_at?: string
          estate_id?: string
          id?: string
          label_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_labels_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_labels_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          amendment_note: string | null
          completed_at: string
          completed_by_user_id: string | null
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          task_id: string
        }
        Insert: {
          amendment_note?: string | null
          completed_at?: string
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          task_id: string
        }
        Update: {
          amendment_note?: string | null
          completed_at?: string
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          asset_id: string | null
          assigned_to_user_id: string | null
          assigned_vendor_id: string | null
          created_at: string
          description: string | null
          description_es: string | null
          due_date: string | null
          estate_id: string
          frequency: Database["public"]["Enums"]["task_frequency"] | null
          id: string
          priority: number | null
          required_photo: boolean | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          title_es: string | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          asset_id?: string | null
          assigned_to_user_id?: string | null
          assigned_vendor_id?: string | null
          created_at?: string
          description?: string | null
          description_es?: string | null
          due_date?: string | null
          estate_id: string
          frequency?: Database["public"]["Enums"]["task_frequency"] | null
          id?: string
          priority?: number | null
          required_photo?: boolean | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          title_es?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          asset_id?: string | null
          assigned_to_user_id?: string | null
          assigned_vendor_id?: string | null
          created_at?: string
          description?: string | null
          description_es?: string | null
          due_date?: string | null
          estate_id?: string
          frequency?: Database["public"]["Enums"]["task_frequency"] | null
          id?: string
          priority?: number | null
          required_photo?: boolean | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          title_es?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string
          email: string | null
          estate_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          service_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          estate_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          estate_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_alerts: {
        Row: {
          created_at: string
          estate_id: string
          fired_at: string
          id: string
          message: string
          message_es: string | null
          rule_id: string | null
          severity: string | null
          status: Database["public"]["Enums"]["alert_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estate_id: string
          fired_at?: string
          id?: string
          message: string
          message_es?: string | null
          rule_id?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estate_id?: string
          fired_at?: string
          id?: string
          message?: string
          message_es?: string | null
          rule_id?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_alerts_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "weather_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_rules: {
        Row: {
          action_text: string
          action_text_es: string | null
          auto_create_tasks: boolean | null
          created_at: string
          enabled: boolean | null
          estate_id: string
          id: string
          rule_type: Database["public"]["Enums"]["weather_rule_type"]
          threshold_json: Json
          updated_at: string
        }
        Insert: {
          action_text: string
          action_text_es?: string | null
          auto_create_tasks?: boolean | null
          created_at?: string
          enabled?: boolean | null
          estate_id: string
          id?: string
          rule_type: Database["public"]["Enums"]["weather_rule_type"]
          threshold_json: Json
          updated_at?: string
        }
        Update: {
          action_text?: string
          action_text_es?: string | null
          auto_create_tasks?: boolean | null
          created_at?: string
          enabled?: boolean | null
          estate_id?: string
          id?: string
          rule_type?: Database["public"]["Enums"]["weather_rule_type"]
          threshold_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_rules_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          color: string | null
          created_at: string
          estate_id: string
          geometry_geojson: Json | null
          id: string
          name: string
          notes: string | null
          purpose_tags: string[] | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          estate_id: string
          geometry_geojson?: Json | null
          id?: string
          name: string
          notes?: string | null
          purpose_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          estate_id?: string
          geometry_geojson?: Json | null
          id?: string
          name?: string
          notes?: string | null
          purpose_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "active" | "acknowledged" | "resolved"
      app_role: "owner" | "manager" | "crew" | "vendor"
      asset_type:
        | "plant"
        | "tree"
        | "irrigation_controller"
        | "valve"
        | "lighting_transformer"
        | "hardscape"
        | "equipment"
        | "structure"
      document_category:
        | "warranty"
        | "asbuilt"
        | "irrigation"
        | "lighting"
        | "planting_plan"
        | "vendor_contract"
        | "insurance"
        | "other"
      native_status: "native" | "naturalized" | "exotic" | "invasive"
      plant_category:
        | "ornamental"
        | "edible"
        | "structural"
        | "ecological"
        | "other"
      task_frequency:
        | "once"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "annual"
        | "seasonal"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
      weather_rule_type: "freeze" | "heavy_rain" | "high_wind" | "drought"
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
      alert_status: ["active", "acknowledged", "resolved"],
      app_role: ["owner", "manager", "crew", "vendor"],
      asset_type: [
        "plant",
        "tree",
        "irrigation_controller",
        "valve",
        "lighting_transformer",
        "hardscape",
        "equipment",
        "structure",
      ],
      document_category: [
        "warranty",
        "asbuilt",
        "irrigation",
        "lighting",
        "planting_plan",
        "vendor_contract",
        "insurance",
        "other",
      ],
      native_status: ["native", "naturalized", "exotic", "invasive"],
      plant_category: [
        "ornamental",
        "edible",
        "structural",
        "ecological",
        "other",
      ],
      task_frequency: [
        "once",
        "weekly",
        "monthly",
        "quarterly",
        "annual",
        "seasonal",
      ],
      task_status: ["pending", "in_progress", "completed", "overdue"],
      weather_rule_type: ["freeze", "heavy_rain", "high_wind", "drought"],
    },
  },
} as const

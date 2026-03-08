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
      client_payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          notes: string | null
          org_id: string
          payment_date: string
          payment_method: string
          reference: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id: string
          payment_date?: string
          payment_method?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id?: string
          payment_date?: string
          payment_method?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          estate_id: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          estate_id?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          estate_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compost_applications: {
        Row: {
          applied_at: string
          applied_by: string | null
          asset_id: string | null
          id: string
          notes: string | null
          pile_id: string
          quantity_kg: number | null
          zone_id: string | null
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          asset_id?: string | null
          id?: string
          notes?: string | null
          pile_id: string
          quantity_kg?: number | null
          zone_id?: string | null
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          asset_id?: string | null
          id?: string
          notes?: string | null
          pile_id?: string
          quantity_kg?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compost_applications_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compost_applications_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compost_applications_pile_id_fkey"
            columns: ["pile_id"]
            isOneToOne: false
            referencedRelation: "compost_piles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compost_applications_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      compost_ingredients: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          ingredient_type: Database["public"]["Enums"]["compost_ingredient_type"]
          name: string
          notes: string | null
          pile_id: string
          quantity_kg: number | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          ingredient_type: Database["public"]["Enums"]["compost_ingredient_type"]
          name: string
          notes?: string | null
          pile_id: string
          quantity_kg?: number | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          ingredient_type?: Database["public"]["Enums"]["compost_ingredient_type"]
          name?: string
          notes?: string | null
          pile_id?: string
          quantity_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compost_ingredients_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compost_ingredients_pile_id_fkey"
            columns: ["pile_id"]
            isOneToOne: false
            referencedRelation: "compost_piles"
            referencedColumns: ["id"]
          },
        ]
      }
      compost_logs: {
        Row: {
          id: string
          logged_at: string
          logged_by: string | null
          moisture_percent: number | null
          notes: string | null
          photo_url: string | null
          pile_id: string
          temperature_c: number | null
          turned: boolean | null
        }
        Insert: {
          id?: string
          logged_at?: string
          logged_by?: string | null
          moisture_percent?: number | null
          notes?: string | null
          photo_url?: string | null
          pile_id: string
          temperature_c?: number | null
          turned?: boolean | null
        }
        Update: {
          id?: string
          logged_at?: string
          logged_by?: string | null
          moisture_percent?: number | null
          notes?: string | null
          photo_url?: string | null
          pile_id?: string
          temperature_c?: number | null
          turned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "compost_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compost_logs_pile_id_fkey"
            columns: ["pile_id"]
            isOneToOne: false
            referencedRelation: "compost_piles"
            referencedColumns: ["id"]
          },
        ]
      }
      compost_piles: {
        Row: {
          actual_ready_at: string | null
          created_at: string
          estate_id: string
          estimated_ready_at: string | null
          id: string
          name: string
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["compost_pile_status"]
          updated_at: string
          volume_liters: number | null
          zone_id: string | null
        }
        Insert: {
          actual_ready_at?: string | null
          created_at?: string
          estate_id: string
          estimated_ready_at?: string | null
          id?: string
          name: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["compost_pile_status"]
          updated_at?: string
          volume_liters?: number | null
          zone_id?: string | null
        }
        Update: {
          actual_ready_at?: string | null
          created_at?: string
          estate_id?: string
          estimated_ready_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["compost_pile_status"]
          updated_at?: string
          volume_liters?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compost_piles_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compost_piles_zone_id_fkey"
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
      elevation_transects: {
        Row: {
          created_at: string
          estate_id: string
          id: string
          line_geojson: Json
          name: string | null
          profile_data: Json | null
        }
        Insert: {
          created_at?: string
          estate_id: string
          id?: string
          line_geojson: Json
          name?: string | null
          profile_data?: Json | null
        }
        Update: {
          created_at?: string
          estate_id?: string
          id?: string
          line_geojson?: Json
          name?: string | null
          profile_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "elevation_transects_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
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
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          condition: Database["public"]["Enums"]["inventory_condition"] | null
          created_at: string
          description: string | null
          estate_id: string
          id: string
          name: string
          name_es: string | null
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          quantity: number
          serial_number: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          condition?: Database["public"]["Enums"]["inventory_condition"] | null
          created_at?: string
          description?: string | null
          estate_id: string
          id?: string
          name: string
          name_es?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_number?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          condition?: Database["public"]["Enums"]["inventory_condition"] | null
          created_at?: string
          description?: string | null
          estate_id?: string
          id?: string
          name?: string
          name_es?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_number?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          product_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          product_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_percent: number | null
          total: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_percent?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_percent?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
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
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_es: string | null
          org_id: string
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_es?: string | null
          org_id: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_es?: string | null
          org_id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      shift_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_by: string | null
          payment_date: string
          payment_method: string
          reference: string | null
          shift_id: string
          validation_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method: string
          reference?: string | null
          shift_id: string
          validation_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method?: string
          reference?: string | null
          shift_id?: string
          validation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_payments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "worker_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_payments_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "shift_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_validations: {
        Row: {
          adjusted_minutes: number | null
          ai_generated_message: string | null
          created_at: string
          decision_message: string | null
          decision_type: string | null
          id: string
          original_minutes: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          shift_id: string
          status: string
          updated_at: string
        }
        Insert: {
          adjusted_minutes?: number | null
          ai_generated_message?: string | null
          created_at?: string
          decision_message?: string | null
          decision_type?: string | null
          id?: string
          original_minutes?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          adjusted_minutes?: number | null
          ai_generated_message?: string | null
          created_at?: string
          decision_message?: string | null
          decision_type?: string | null
          id?: string
          original_minutes?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_validations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_validations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "worker_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paypal_capture_id: string | null
          paypal_order_id: string | null
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      task_templates: {
        Row: {
          asset_type: string | null
          created_at: string
          description: string | null
          description_es: string | null
          enabled: boolean | null
          estate_id: string
          frequency: string
          id: string
          is_ai_generated: boolean | null
          plant_profile_id: string | null
          priority: number | null
          required_photo: boolean | null
          season_months: number[] | null
          title: string
          title_es: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string | null
          created_at?: string
          description?: string | null
          description_es?: string | null
          enabled?: boolean | null
          estate_id: string
          frequency?: string
          id?: string
          is_ai_generated?: boolean | null
          plant_profile_id?: string | null
          priority?: number | null
          required_photo?: boolean | null
          season_months?: number[] | null
          title: string
          title_es?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string | null
          created_at?: string
          description?: string | null
          description_es?: string | null
          enabled?: boolean | null
          estate_id?: string
          frequency?: string
          id?: string
          is_ai_generated?: boolean | null
          plant_profile_id?: string | null
          priority?: number | null
          required_photo?: boolean | null
          season_months?: number[] | null
          title?: string
          title_es?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_plant_profile_id_fkey"
            columns: ["plant_profile_id"]
            isOneToOne: false
            referencedRelation: "plant_profiles"
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
      tool_assignments: {
        Row: {
          assigned_at: string
          assigned_to_user_id: string
          created_at: string
          estate_id: string
          expected_return_at: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          quantity_assigned: number
          return_condition:
            | Database["public"]["Enums"]["inventory_condition"]
            | null
          returned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_to_user_id: string
          created_at?: string
          estate_id: string
          expected_return_at?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity_assigned?: number
          return_condition?:
            | Database["public"]["Enums"]["inventory_condition"]
            | null
          returned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_to_user_id?: string
          created_at?: string
          estate_id?: string
          expected_return_at?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity_assigned?: number
          return_condition?:
            | Database["public"]["Enums"]["inventory_condition"]
            | null
          returned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_assignments_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      topographic_references: {
        Row: {
          analysis_data: Json | null
          created_at: string
          description: string | null
          estate_id: string
          geometry_geojson: Json
          geometry_type: string
          id: string
          name: string
          source_filename: string | null
          updated_at: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          description?: string | null
          estate_id: string
          geometry_geojson: Json
          geometry_type: string
          id?: string
          name: string
          source_filename?: string | null
          updated_at?: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          description?: string | null
          estate_id?: string
          geometry_geojson?: Json
          geometry_type?: string
          id?: string
          name?: string
          source_filename?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topographic_references_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
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
      work_log_entries: {
        Row: {
          created_at: string
          entry_type: string | null
          id: string
          processed_text: string | null
          raw_text: string
          shift_id: string
        }
        Insert: {
          created_at?: string
          entry_type?: string | null
          id?: string
          processed_text?: string | null
          raw_text: string
          shift_id: string
        }
        Update: {
          created_at?: string
          entry_type?: string | null
          id?: string
          processed_text?: string | null
          raw_text?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_log_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "worker_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_rates: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          estate_id: string
          id: string
          notes: string | null
          rate_amount: number
          rate_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          estate_id: string
          id?: string
          notes?: string | null
          rate_amount: number
          rate_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          estate_id?: string
          id?: string
          notes?: string | null
          rate_amount?: number
          rate_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_rates_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_rates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_shifts: {
        Row: {
          asset_id: string | null
          check_in_at: string
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_url: string | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_url: string | null
          checkin_type: string | null
          created_at: string
          estate_id: string
          gps_validated: boolean | null
          id: string
          notes: string | null
          qr_code_in: string | null
          qr_code_out: string | null
          tasks_completed: string[] | null
          updated_at: string
          user_id: string
          work_description: string | null
          work_description_raw: string[] | null
          zone_id: string | null
        }
        Insert: {
          asset_id?: string | null
          check_in_at?: string
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_url?: string | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_url?: string | null
          checkin_type?: string | null
          created_at?: string
          estate_id: string
          gps_validated?: boolean | null
          id?: string
          notes?: string | null
          qr_code_in?: string | null
          qr_code_out?: string | null
          tasks_completed?: string[] | null
          updated_at?: string
          user_id: string
          work_description?: string | null
          work_description_raw?: string[] | null
          zone_id?: string | null
        }
        Update: {
          asset_id?: string | null
          check_in_at?: string
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_url?: string | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_url?: string | null
          checkin_type?: string | null
          created_at?: string
          estate_id?: string
          gps_validated?: boolean | null
          id?: string
          notes?: string | null
          qr_code_in?: string | null
          qr_code_out?: string | null
          tasks_completed?: string[] | null
          updated_at?: string
          user_id?: string
          work_description?: string | null
          work_description_raw?: string[] | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_shifts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_shifts_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_shifts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
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
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
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
      compost_ingredient_type:
        | "green"
        | "brown"
        | "activator"
        | "water"
        | "other"
      compost_pile_status:
        | "active"
        | "curing"
        | "ready"
        | "applied"
        | "archived"
      document_category:
        | "warranty"
        | "asbuilt"
        | "irrigation"
        | "lighting"
        | "planting_plan"
        | "vendor_contract"
        | "insurance"
        | "other"
      inventory_category: "hand_tool" | "equipment" | "supply" | "material"
      inventory_condition:
        | "new"
        | "good"
        | "fair"
        | "needs_repair"
        | "out_of_service"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
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
      compost_ingredient_type: [
        "green",
        "brown",
        "activator",
        "water",
        "other",
      ],
      compost_pile_status: ["active", "curing", "ready", "applied", "archived"],
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
      inventory_category: ["hand_tool", "equipment", "supply", "material"],
      inventory_condition: [
        "new",
        "good",
        "fair",
        "needs_repair",
        "out_of_service",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
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

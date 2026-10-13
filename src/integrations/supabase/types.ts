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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_progress: {
        Row: {
          completed_at: string | null
          course_slug: string
          created_at: string
          id: string
          module_slug: string
          passed: boolean
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_slug: string
          created_at?: string
          id?: string
          module_slug: string
          passed?: boolean
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_slug?: string
          created_at?: string
          id?: string
          module_slug?: string
          passed?: boolean
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cats: {
        Row: {
          breed: string | null
          created_at: string
          dob: string | null
          gender: string
          id: string
          name: string
          notes: string | null
          pedigree_url: string | null
          photo_url: string | null
          registration_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breed?: string | null
          created_at?: string
          dob?: string | null
          gender: string
          id?: string
          name: string
          notes?: string | null
          pedigree_url?: string | null
          photo_url?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breed?: string | null
          created_at?: string
          dob?: string | null
          gender?: string
          id?: string
          name?: string
          notes?: string | null
          pedigree_url?: string | null
          photo_url?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          position: number
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          cat_id: string
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          notes: string | null
          record_type: string
          test_date: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          cat_id: string
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          notes?: string | null
          record_type: string
          test_date?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          cat_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          record_type?: string
          test_date?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_cat_id_fkey"
            columns: ["cat_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
        ]
      }
      kittens: {
        Row: {
          color: string | null
          contract_file_name: string | null
          contract_url: string | null
          created_at: string
          gender: string | null
          id: string
          litter_id: string
          name: string | null
          notes: string | null
          owner_address: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          registration_number: string | null
          sale_date: string | null
          sale_price: number | null
          sale_rights: string | null
          sold: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          contract_file_name?: string | null
          contract_url?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          litter_id: string
          name?: string | null
          notes?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          registration_number?: string | null
          sale_date?: string | null
          sale_price?: number | null
          sale_rights?: string | null
          sold?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          contract_file_name?: string | null
          contract_url?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          litter_id?: string
          name?: string | null
          notes?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          registration_number?: string | null
          sale_date?: string | null
          sale_price?: number | null
          sale_rights?: string | null
          sold?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kittens_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: string | null
          content_blocks: Json
          created_at: string
          duration_minutes: number | null
          id: string
          is_prerequisite: boolean
          kind: string
          module_id: string
          pass_threshold_pct: number
          position: number
          question_count: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body?: string | null
          content_blocks?: Json
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_prerequisite?: boolean
          kind?: string
          module_id: string
          pass_threshold_pct?: number
          position?: number
          question_count?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body?: string | null
          content_blocks?: Json
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_prerequisite?: boolean
          kind?: string
          module_id?: string
          pass_threshold_pct?: number
          position?: number
          question_count?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      litters: {
        Row: {
          created_at: string
          dob: string
          females_count: number
          id: string
          kitten_count: number
          males_count: number
          mating_id: string | null
          notes: string | null
          queen_id: string | null
          stud_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dob: string
          females_count?: number
          id?: string
          kitten_count?: number
          males_count?: number
          mating_id?: string | null
          notes?: string | null
          queen_id?: string | null
          stud_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dob?: string
          females_count?: number
          id?: string
          kitten_count?: number
          males_count?: number
          mating_id?: string | null
          notes?: string | null
          queen_id?: string | null
          stud_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "litters_mating_id_fkey"
            columns: ["mating_id"]
            isOneToOne: false
            referencedRelation: "matings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_queen_id_fkey"
            columns: ["queen_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_stud_id_fkey"
            columns: ["stud_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
        ]
      }
      matings: {
        Row: {
          created_at: string
          id: string
          mating_date: string
          mating_end_date: string | null
          notes: string | null
          queen_id: string
          status: string
          stud_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mating_date: string
          mating_end_date?: string | null
          notes?: string | null
          queen_id: string
          status?: string
          stud_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mating_date?: string
          mating_end_date?: string | null
          notes?: string | null
          queen_id?: string
          status?: string
          stud_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matings_queen_id_fkey"
            columns: ["queen_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matings_stud_id_fkey"
            columns: ["stud_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          breed: string | null
          cattery_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          multiple_breeds: boolean
          registration_body: string | null
          registration_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breed?: string | null
          cattery_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          multiple_breeds?: boolean
          registration_body?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breed?: string | null
          cattery_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          multiple_breeds?: boolean
          registration_body?: string | null
          registration_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          choices: Json
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          lesson_id: string
          position: number
          prompt: string
          updated_at: string
        }
        Insert: {
          choices?: Json
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id: string
          position?: number
          prompt: string
          updated_at?: string
        }
        Update: {
          choices?: Json
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id?: string
          position?: number
          prompt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          choices: Json
          created_at: string
          id: string
          lesson_id: string | null
          position: number
          prompt: string
          question_type: string
          updated_at: string
        }
        Insert: {
          choices?: Json
          created_at?: string
          id?: string
          lesson_id?: string | null
          position?: number
          prompt: string
          question_type?: string
          updated_at?: string
        }
        Update: {
          choices?: Json
          created_at?: string
          id?: string
          lesson_id?: string | null
          position?: number
          prompt?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answer_choice_index: number | null
          answer_text: string | null
          created_at: string
          id: string
          lesson_id: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          answer_choice_index?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          answer_choice_index?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exec_sql: {
        Args: { caller_user_id: string; query: string }
        Returns: undefined
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
      app_role: "admin" | "moderator" | "user"
      lesson_kind: "video" | "text" | "quiz" | "survey"
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
      app_role: ["admin", "moderator", "user"],
      lesson_kind: ["video", "text", "quiz", "survey"],
    },
  },
} as const

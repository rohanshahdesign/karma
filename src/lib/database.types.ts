// Generated Supabase database types
// This file should be generated from your Supabase schema
// For now, we'll define the types manually based on our schema

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          currency_name: string;
          monthly_allowance: number;
          min_transaction_amount: number;
          max_transaction_amount: number;
          daily_limit_percentage: number;
          reward_approval_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          currency_name: string;
          monthly_allowance: number;
          min_transaction_amount?: number;
          max_transaction_amount?: number;
          daily_limit_percentage?: number;
          reward_approval_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          currency_name?: string;
          monthly_allowance?: number;
          min_transaction_amount?: number;
          max_transaction_amount?: number;
          daily_limit_percentage?: number;
          reward_approval_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          workspace_id: string;
          email: string;
          full_name: string | null;
          role: 'employee' | 'admin' | 'super_admin';
          giving_balance: number;
          redeemable_balance: number;
          department: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          workspace_id: string;
          email: string;
          full_name?: string | null;
          role?: 'employee' | 'admin' | 'super_admin';
          giving_balance?: number;
          redeemable_balance?: number;
          department?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          workspace_id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'employee' | 'admin' | 'super_admin';
          giving_balance?: number;
          redeemable_balance?: number;
          department?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          workspace_id: string;
          sender_profile_id: string;
          receiver_profile_id: string;
          amount: number;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sender_profile_id: string;
          receiver_profile_id: string;
          amount: number;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          sender_profile_id?: string;
          receiver_profile_id?: string;
          amount?: number;
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          workspace_id: string;
          created_by_profile_id: string;
          code: string;
          token: string;
          expires_at: string | null;
          max_uses: number | null;
          uses_count: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by_profile_id: string;
          code: string;
          token?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          uses_count?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          created_by_profile_id?: string;
          code?: string;
          token?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          uses_count?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      pending_users: {
        Row: {
          auth_user_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          auth_user_id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          auth_user_id?: string;
          email?: string;
          created_at?: string;
        };
      };
      daily_sent_karma: {
        Row: {
          profile_id: string;
          day: string;
          amount_sent: number;
        };
        Insert: {
          profile_id: string;
          day?: string;
          amount_sent?: number;
        };
        Update: {
          profile_id?: string;
          day?: string;
          amount_sent?: number;
        };
      };
    };
    Views: {
      current_profile: {
        Row: {
          id: string;
          auth_user_id: string;
          workspace_id: string;
          email: string;
          full_name: string | null;
          role: 'employee' | 'admin' | 'super_admin';
          giving_balance: number;
          redeemable_balance: number;
          department: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      create_workspace_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_currency_name: string;
          p_monthly_allowance: number;
          p_owner_email: string;
          p_min_transaction_amount?: number;
          p_max_transaction_amount?: number;
          p_daily_limit_percentage?: number;
          p_reward_approval_threshold?: number;
        };
        Returns: string;
      };
      validate_and_create_transaction: {
        Args: {
          p_sender_profile_id: string;
          p_receiver_profile_id: string;
          p_amount: number;
          p_message?: string | null;
        };
        Returns: string;
      };
      promote_user_to_admin: {
        Args: {
          p_target_profile_id: string;
        };
        Returns: boolean;
      };
      demote_admin_to_employee: {
        Args: {
          p_target_profile_id: string;
        };
        Returns: boolean;
      };
      is_member_of_workspace: {
        Args: {
          p_workspace_id: string;
        };
        Returns: boolean;
      };
      is_admin_of_workspace: {
        Args: {
          p_workspace_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'employee' | 'admin' | 'super_admin';
    };
  };
}

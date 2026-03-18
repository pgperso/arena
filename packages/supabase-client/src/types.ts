// Auto-generated types from Supabase will go here.
// Run `npx supabase gen types typescript` to regenerate.

export type Database = {
  public: {
    Tables: {
      communities: {
        Row: {
          id: number;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          primary_color: string;
          secondary_color: string;
          is_active: boolean;
          member_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          is_active?: boolean;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          is_active?: boolean;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          username: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          description: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          legacy_password_hash: string | null;
          password_migrated: boolean;
          legacy_member_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          description?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          legacy_password_hash?: string | null;
          password_migrated?: boolean;
          legacy_member_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          description?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          legacy_password_hash?: string | null;
          password_migrated?: boolean;
          legacy_member_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_members: {
        Row: {
          id: number;
          community_id: number;
          member_id: string;
          joined_at: string;
        };
        Insert: {
          id?: number;
          community_id: number;
          member_id: string;
          joined_at?: string;
        };
        Update: {
          id?: number;
          community_id?: number;
          member_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'community_members_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'community_members_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: number;
          community_id: number;
          member_id: string | null;
          content: string;
          is_removed: boolean;
          removed_at: string | null;
          removed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          community_id: number;
          member_id?: string | null;
          content: string;
          is_removed?: boolean;
          removed_at?: string | null;
          removed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          community_id?: number;
          member_id?: string | null;
          content?: string;
          is_removed?: boolean;
          removed_at?: string | null;
          removed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_removed_by_fkey';
            columns: ['removed_by'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_presence: {
        Row: {
          id: number;
          community_id: number;
          member_id: string;
          client_type: string;
          last_seen_at: string;
        };
        Insert: {
          id?: number;
          community_id: number;
          member_id: string;
          client_type?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: number;
          community_id?: number;
          member_id?: string;
          client_type?: string;
          last_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_presence_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_presence_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      podcasts: {
        Row: {
          id: number;
          community_id: number;
          title: string;
          description: string | null;
          audio_url: string;
          duration_seconds: number | null;
          published_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          community_id: number;
          title: string;
          audio_url: string;
          description?: string | null;
          duration_seconds?: number | null;
          published_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          community_id?: number;
          title?: string;
          audio_url?: string;
          description?: string | null;
          duration_seconds?: number | null;
          published_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'podcasts_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'podcasts_published_by_fkey';
            columns: ['published_by'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          id: number;
          code: string;
          name: string;
        };
        Insert: {
          id?: number;
          code: string;
          name: string;
        };
        Update: {
          id?: number;
          code?: string;
          name?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: number;
          role_id: number;
          permission: string;
        };
        Insert: {
          id?: number;
          role_id: number;
          permission: string;
        };
        Update: {
          id?: number;
          role_id?: number;
          permission?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      community_member_roles: {
        Row: {
          id: number;
          community_id: number;
          member_id: string;
          role_id: number;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          id?: number;
          community_id: number;
          member_id: string;
          role_id: number;
          granted_at?: string;
          granted_by?: string | null;
        };
        Update: {
          id?: number;
          community_id?: number;
          member_id?: string;
          role_id?: number;
          granted_at?: string;
          granted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'community_member_roles_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'community_member_roles_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'community_member_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'community_member_roles_granted_by_fkey';
            columns: ['granted_by'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
      member_restrictions: {
        Row: {
          id: number;
          community_id: number;
          member_id: string;
          restriction_type: string;
          reason: string | null;
          starts_at: string;
          ends_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          community_id: number;
          member_id: string;
          restriction_type: string;
          reason?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          community_id?: number;
          member_id?: string;
          restriction_type?: string;
          reason?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'member_restrictions_community_id_fkey';
            columns: ['community_id'];
            isOneToOne: false;
            referencedRelation: 'communities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_restrictions_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_restrictions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Enums } from '@/integrations/supabase/types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// TYPES — derived directly from the generated Supabase schema.
// ---------------------------------------------------------------------------

export type AppRole       = Enums<'user_role'>;
export type Profile       = Tables<'profiles'>;
export type FarmerProfile = Tables<'farmer_profiles'>;
export type BuyerProfile  = Tables<'buyer_profiles'>;
export type ExpertProfile = Tables<'expert_profiles'>;

// ---------------------------------------------------------------------------
// ROLE DETAIL PAYLOADS — used only during registration
// ---------------------------------------------------------------------------

interface FarmerRegistrationDetails {
  entityType: Enums<'entity_type'>;
  farmBusinessName?: string;
  province: string;
  district: string;
  municipality: string;
  wardNumber: string;
  toleName?: string;
  farmType: string;
}

interface BuyerRegistrationDetails {
  buyerBusinessName: string;
  province: string;
  district: string;
  municipality: string;
}

interface ExpertRegistrationDetails {
  specialization: string;
  experienceYears: number;
}

type RoleDetails =
  | FarmerRegistrationDetails
  | BuyerRegistrationDetails
  | ExpertRegistrationDetails;

// ---------------------------------------------------------------------------
// CONTEXT SHAPE - DEFINED ONCE, IN THE RIGHT PLACE
// ---------------------------------------------------------------------------

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  farmerProfile: FarmerProfile | null;
  buyerProfile: BuyerProfile | null;
  expertProfile: ExpertProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    assignedRole: AppRole,
    roleDetails?: RoleDetails,
  ) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // 🔥 OTP Password Reset Methods
  sendPasswordResetCode: (email: string) => Promise<{ error: string | null }>;
  verifyPasswordResetCode: (email: string, code: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

// ---------------------------------------------------------------------------
// CONTEXT + PROVIDER
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession]   = useState<Session | null>(null);
  const [user, setUser]         = useState<SupabaseUser | null>(null);

  const [profile, setProfile]             = useState<Profile | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [buyerProfile, setBuyerProfile]   = useState<BuyerProfile | null>(null);
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);

  const [role, setRole]       = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // -------------------------------------------------------------------------
  // PROFILE FETCH
  // -------------------------------------------------------------------------

  const clearProfileState = useCallback(() => {
    setProfile(null);
    setFarmerProfile(null);
    setBuyerProfile(null);
    setExpertProfile(null);
    setRole(null);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('🔍 Fetching profile for user:', userId);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        console.error('❌ Profile fetch error:', profileError);
        throw new Error(profileError?.message ?? 'Profile not found');
      }

      console.log('✅ Profile fetched:', { role: profileData.role, id: profileData.id });
      
      setProfile(profileData);
      setRole(profileData.role);

      if (profileData.role === 'farmer') {
        const { data: fData } = await supabase
          .from('farmer_profiles').select('*').eq('profile_id', userId).maybeSingle();
        setFarmerProfile(fData);
        console.log('✅ Farmer profile fetched');
      } else if (profileData.role === 'buyer') {
        const { data: bData } = await supabase
          .from('buyer_profiles').select('*').eq('profile_id', userId).maybeSingle();
        setBuyerProfile(bData);
        console.log('✅ Buyer profile fetched');
      } else if (profileData.role === 'expert') {
        const { data: eData } = await supabase
          .from('expert_profiles').select('*').eq('profile_id', userId).maybeSingle();
        setExpertProfile(eData);
        console.log('✅ Expert profile fetched');
      }
      
      return profileData.role;
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      throw err;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // -------------------------------------------------------------------------
  // AUTH STATE LISTENER
  // -------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (isMounted && initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('❌ Initial session check failed:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        console.log('🔐 Auth event:', event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          clearProfileState();
        } 
        else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            fetchProfile(currentSession.user.id).catch(console.error);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearProfileState]);

  // -------------------------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------------------------

  const login = useCallback(async (email: string, password: string) => {
    console.log('🔑 Login attempt for:', email);
    setLoading(true);
    
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        console.error('❌ Login error:', error.message);
        setLoading(false);
        return { error: error.message };
      }

      console.log('✅ Login successful, waiting for profile...');
      
      if (data.user) {
        try {
          await fetchProfile(data.user.id);
          console.log('✅ Profile loaded after login');
        } catch (profileError) {
          console.error('❌ Profile fetch failed:', profileError);
          return { error: 'Failed to load user profile' };
        }
      }
      
      setLoading(false);
      return { error: null };
      
    } catch (err: any) {
      console.error('❌ Unexpected login error:', err);
      setLoading(false);
      return { error: err?.message ?? 'An unexpected error occurred' };
    }
  }, [fetchProfile]);

  // -------------------------------------------------------------------------
  // REGISTER
  // -------------------------------------------------------------------------

  const register = useCallback(async (
    email: string,
    password: string,
    name: string,
    phone: string,
    assignedRole: AppRole,
    roleDetails?: RoleDetails,
  ) => {
    console.log('📝 Registration attempt for:', email, 'role:', assignedRole);
    setLoading(true);
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role: assignedRole },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        console.error('❌ Signup error:', signUpError.message);
        setLoading(false);
        return { error: signUpError.message };
      }

      const userId = data.user?.id;
      if (!userId) {
        console.error('❌ No user ID returned');
        setLoading(false);
        return { error: 'Registration failed: no user ID returned.' };
      }

      console.log('✅ User created:', userId);

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        role: assignedRole,
        full_name: name,
        phone_number: phone,
      });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError.message);
        setLoading(false);
        return { error: `Profile creation failed: ${profileError.message}` };
      }

      console.log('✅ Base profile created');

      if (assignedRole === 'farmer' && roleDetails) {
        const d = roleDetails as FarmerRegistrationDetails;
        const { error: farmerError } = await supabase.from('farmer_profiles').insert({
          profile_id:   userId,
          entity_type:  d.entityType,
          farm_name:    d.farmBusinessName ?? null,
          province:     d.province,
          district:     d.district,
          municipality: d.municipality,
          ward_number:  d.wardNumber,
          tole_name:    d.toleName ?? null,
          farm_type:    d.farmType,
        });
        if (farmerError) {
          console.error('❌ Farmer profile error:', farmerError.message);
          setLoading(false);
          return { error: `Farmer profile failed to save: ${farmerError.message}` };
        }
        console.log('✅ Farmer profile created');

      } else if (assignedRole === 'buyer' && roleDetails) {
        const d = roleDetails as BuyerRegistrationDetails;
        const { error: buyerError } = await supabase.from('buyer_profiles').insert({
          profile_id:    userId,
          business_name: d.buyerBusinessName,
          province:      d.province,
          district:      d.district,
          municipality:  d.municipality,
        });
        if (buyerError) {
          console.error('❌ Buyer profile error:', buyerError.message);
          setLoading(false);
          return { error: `Buyer profile failed to save: ${buyerError.message}` };
        }
        console.log('✅ Buyer profile created');

      } else if (assignedRole === 'expert' && roleDetails) {
        const d = roleDetails as ExpertRegistrationDetails;
        const { error: expertError } = await supabase.from('expert_profiles').insert({
          profile_id:       userId,
          specialization:   d.specialization,
          experience_years: d.experienceYears,
        });
        if (expertError) {
          console.error('❌ Expert profile error:', expertError.message);
          setLoading(false);
          return { error: `Expert profile failed to save: ${expertError.message}` };
        }
        console.log('✅ Expert profile created');
      }

      if (data.user) {
        try {
          await fetchProfile(data.user.id);
          console.log('✅ Profile loaded after registration');
        } catch (profileError) {
          console.error('❌ Profile fetch failed:', profileError);
          setLoading(false);
          return { error: 'Failed to load user profile after registration' };
        }
      }

      setLoading(false);
      console.log('✅ Registration complete');
      return { error: null };
      
    } catch (err: any) {
      console.error('❌ Unexpected registration error:', err);
      setLoading(false);
      return { error: err?.message ?? 'Registration failed unexpectedly' };
    }
  }, [fetchProfile]);

  // -------------------------------------------------------------------------
  // 🔥 PASSWORD RESET - OTP METHODS
  // -------------------------------------------------------------------------

  const sendPasswordResetCode = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);
      return { error: error?.message || null };
    } catch (err: any) {
      setLoading(false);
      return { error: err?.message || 'Failed to send reset code' };
    }
  }, []);

  const verifyPasswordResetCode = useCallback(async (email: string, code: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery', // "recovery" type specifically handles password resets in Supabase
      });
      setLoading(false);
      return { error: error?.message || null };
    } catch (err: any) {
      setLoading(false);
      return { error: err?.message || 'Failed to verify code' };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      return { error: error?.message || null };
    } catch (err: any) {
      setLoading(false);
      return { error: err?.message || 'Failed to update password' };
    }
  }, []);

  // -------------------------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------------------------

  const logout = useCallback(async () => {
    console.log('🚪 Logging out');
    await supabase.auth.signOut();
  }, []);

  // -------------------------------------------------------------------------
  // DEBUG LOGGING
  // -------------------------------------------------------------------------

  useEffect(() => {
    console.log('📊 Auth State:', {
      isAuthenticated: !!session,
      hasUser: !!user,
      hasProfile: !!profile,
      role,
      loading,
      initializing,
    });
  }, [session, user, profile, role, loading, initializing]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      farmerProfile,
      buyerProfile,
      expertProfile,
      role,
      isAuthenticated: !!session,
      loading,
      initializing,
      login,
      register,
      logout,
      refreshProfile,
      sendPasswordResetCode,
      verifyPasswordResetCode,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
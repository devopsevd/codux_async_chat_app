import { createClient } from '@supabase/supabase-js';
import React, { createContext, useContext, useState, useEffect } from 'react';

const SupabaseContext = createContext();

const supabaseUrl = "https://wxgprrqxoxfvjhpomqpu.supabase.co" //process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Z3BycnF4b3hmdmpocG9tcXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NTc3NTgsImV4cCI6MjA1NzAzMzc1OH0.NUPi38O7b7GSO8Hu1MrFRNPsRdVaICeqEq3QL4iIiQA" //process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function SupabaseAuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });
    }, []);

    const value = {
        session,
        user,
    };

    return (
        <SupabaseContext.Provider value={value}>
            {children}
        </SupabaseContext.Provider>
    );
}

export function useSupabaseAuth() {
    return useContext(SupabaseContext);
}

export function useUser() {
    const { user } = useSupabaseAuth();
    return user;
}

export function useSession() {
    const { session } = useSupabaseAuth();
    return session;
}
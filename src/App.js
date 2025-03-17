import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ChatWindow from './components/ChatWindow';
import SessionList from './components/SessionList'; // **IMPORT SessionList**
import './styles.css';
import { useUser,supabase } from './supabaseClient';


function App() {
    const user = useUser();
    const [activeSessions, setActiveSessions] = useState([]);
    const [closedSessions, setClosedSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [isSessionActive, setIsSessionActive] = useState(false); // Track if selected session is active
    const [chatWindowKey, setChatWindowKey] = useState(0); // **NEW STATE VARIABLE for component key**
    useEffect(() => {
        if (user) {
            fetchSessions();
        } else {
            setActiveSessions([]);
            setClosedSessions([]);
            setSelectedSessionId(null); // Clear selected session on logout
        }
    }, [user]);

    // ===== Replace your current fetchSessions function in App.js with this =====
    const fetchSessions = async () => {
        if (!user) return;
        console.log("App.js: fetchSessions - User object:", user);

        try {
            // **Fetch the session using supabase.auth.getSession()**
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error("App.js: fetchSessions - Error getting session:", sessionError);
                alert('Failed to get session. Please refresh and try again.');
                return; // Exit if session fetch fails
            }

            if (!session) {
                console.warn("App.js: fetchSessions - No active session found after login.");
                return; // Exit if no session is found, even after login (rare case)
            }

            const accessToken = session.access_token; // **Get access_token from the session object**
            console.log("App.js: fetchSessions - Access Token from session:", accessToken); // Log the access token

            const response = await fetch('http://localhost:3001/api/sessions', {
                headers: {
                    Authorization: `Bearer ${accessToken}`, // **Use accessToken from session here**
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setActiveSessions(data.activeSessions);
            setClosedSessions(data.closedSessions);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            alert('Failed to load sessions.');
        }
    };

    const handleSessionSelect = (session) => {
        setSelectedSessionId(session.id);
        setIsSessionActive(session.is_active); // Update session active status
        setChatWindowKey(prevKey => prevKey + 1); // **NEW: Increment key on session select**
    };

    const handleSessionTerminated = (terminatedSessionId) => {
        setIsSessionActive(false); // Update active status immediately in App state
        // Optimistically update the session lists to reflect the termination without refetching all sessions
        setActiveSessions(prevSessions => prevSessions.filter(session => session.id !== terminatedSessionId));
        setClosedSessions(prevSessions => [...prevSessions, activeSessions.find(session => session.id === terminatedSessionId), ...prevSessions].filter(Boolean)); // Move to closed sessions
    };

    const handleCreateNewSession = async () => { // **NEW function to handle session creation**
        if (!user) return;
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error("App.js: handleCreateNewSession - Error getting session:", sessionError);
                alert('Failed to get session. Please refresh and try again.');
                return;
            }
            if (!session) {
                console.warn("App.js: handleCreateNewSession - No active session found.");
                return;
            }
            const accessToken = session.access_token;

            const response = await fetch('http://localhost:3001/api/sessions/create', { // Call the new /api/sessions/create endpoint
                method: 'POST', // **Important: POST request**
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json', // Explicitly set content type
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("App.js: handleCreateNewSession - New session created:", data);
            fetchSessions(); // Refresh session lists to show the new session
            setSelectedSessionId(data.sessionId); // Automatically select the newly created session
            setIsSessionActive(true); // Set session as active
        } catch (error) {
            console.error('Error creating new session:', error);
            alert('Failed to create new session.');
        }
    };
    const handleSignOut = () => {
        supabase.auth.signOut();
        setActiveSessions([]); // Clear sessions on sign out
        setClosedSessions([]);
        setSelectedSessionId(null);
    };



    return (
        <div className="app-container">
            <div className="app-header">
                <h1>Webhook Chat App</h1>
                {user && (
                    <button onClick={handleSignOut} className="sign-out-button app-sign-out-button">Sign Out</button>
                )}
            </div>
            {!user ? (
                <Auth />
            ) : (
                <div className="chat-layout">
                    <div className="active-sessions-column">  {/* **NEW: Column for Active Sessions** */}
                        <button onClick={handleCreateNewSession} className="create-session-button">Create New Session</button>
                        <SessionList
                            sessions={activeSessions}
                            onSessionSelect={handleSessionSelect}
                            active={true}
                        />
                    </div>
                    <div className="chat-area">
                        {selectedSessionId ? (
                            <ChatWindow
                                key={chatWindowKey} // **NEW: Pass key prop to ChatWindow**
                                sessionId={selectedSessionId}
                                isSessionActive={isSessionActive}
                                onSessionTerminated={handleSessionTerminated}
                            />
                        ) : (
                            <div className="no-session-selected">
                                Select a session to start chatting.
                            </div>
                        )}
                    </div>
                    <div className="closed-sessions-column">  {/* **NEW: Column for Closed Sessions** */}
                        <SessionList
                            sessions={closedSessions}
                            onSessionSelect={handleSessionSelect}
                            active={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );

}

export default App;
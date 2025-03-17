import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import InputArea from './InputArea';
import Message from './Message';

const ChatWindow = () => {
    const [messages, setMessages] = useState([]);
    const [sessionWebhook, setSessionWebhook] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState(null);
    const [currentSession, setCurrentSession] = useState(null); // Add state for currentSession

    useEffect(() => {
        console.log("ChatWindow.js: useEffect - Auth state change listener setup"); // Log: Auth state listener setup
        console.log("supabase.auth object:", supabase.auth); // ADD THIS LINE
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log("ChatWindow.js: supabase.auth.getSession() - Initial session:", session); // Log: Initial session fetch
            setUser(session?.user);
            setCurrentSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            console.log("ChatWindow.js: supabase.auth.onAuthStateChange - Auth state changed:", _event, session); // Log: Auth state change event
            setUser(session?.user);
            setCurrentSession(session);
        });
    }, []);

    useEffect(() => {
        const fetchSessionWebhook = async () => {
            console.log("ChatWindow.js: fetchSessionWebhook - Fetching session webhook..."); // Log: Webhook fetch started
            try {
                const response = await fetch('http://localhost:3001/api/session', {
                    headers: {
                        Authorization: `Bearer ${currentSession?.access_token}`,
                    },
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setSessionWebhook(data.webhookUrl);
                console.log("ChatWindow.js: fetchSessionWebhook - Webhook URL received:", data.webhookUrl); // Log: Webhook URL received
            } catch (error) {
                console.error('Error fetching session webhook:', error);
                alert('Failed to start session. Please refresh and try again.');
            }
        };

        if (user) {
            fetchSessionWebhook();
        } else {
            setSessionWebhook(''); // Clear sessionWebhook if no user logged in
            console.log("ChatWindow.js: fetchSessionWebhook - No user, clearing sessionWebhook"); // Log: Clearing webhook due to no user
        }
    }, [user, currentSession]); // Add currentSession to dependency array

    const sendMessage = async (messageText) => {
        if (messageText.trim() === '' || isSending) return;
        setIsSending(true);
        try {
            const response = await fetch('http://localhost:3001/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentSession?.access_token}`,
                },
                body: JSON.stringify({ message: messageText, webhookUrl: sessionWebhook }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setMessages([...messages, { text: messageText, sender: 'You' }]);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        if (!sessionWebhook) {
            console.log("ChatWindow.js: Polling useEffect - No sessionWebhook, skipping polling"); // Log: Skipping polling - no webhook
            return;
        }

        const pollForResponse = async () => {
            try {
                const pollingURL = `http://localhost:3001${sessionWebhook}`;
                console.log("ChatWindow.js: pollForResponse - Polling URL:", pollingURL);

                const response = await fetch(pollingURL, {
                    headers: {
                        Authorization: `Bearer ${currentSession?.access_token}`,
                    },
                });

                console.log("ChatWindow.js: pollForResponse - HTTP Response Status:", response.status, response.statusText);
                console.log("ChatWindow.js: pollForResponse - response.ok:", response.ok);

                if (response.ok) { // **response.ok is true for 2xx status codes, including 204**
                    if (response.status === 204 || !response.headers.get('content-length'))  { // **ADD - Check for 204 No Content explicitly**
                        console.log("ChatWindow.js: pollForResponse - Received 204 No Content - No AI Response yet"); // Log 204
                        return false; // Continue polling - no response yet
                    } else {
                        const data = await response.json(); // Parse JSON only for non-204 responses (e.g., 200 OK)
                        console.log("ChatWindow.js: pollForResponse - Response Data from Backend:", JSON.stringify(data));

                        if (data && data.response) {
                            setMessages((prevMessages) => [...prevMessages, { text: data.response, sender: 'AI' }]);
                            console.log("ChatWindow.js: pollForResponse - AI Response received:", data.response);
                            return true; // Stop polling if response received
                        } else {
                            console.log("ChatWindow.js: pollForResponse - No 'data.response' found in response:", data);
                        }
                    }
                } else {
                    console.log("ChatWindow.js: pollForResponse - HTTP Response NOT OK:", response.status, response.statusText);
                    if (response.status !== 404) {
                        console.error(`Webhook poll failed with status: ${response.status}`);
                    }
                }
            } catch (error) {
                console.error('Error polling webhook:', error);
            }
            return false;
        };

        let pollingInterval;
        const startPolling = async () => {
            console.log("ChatWindow.js: startPolling - Starting webhook polling for:", sessionWebhook); // Log: Polling started
            pollingInterval = setInterval(async () => {
                if (await pollForResponse()) {
                    clearInterval(pollingInterval); // Stop polling after response
                    console.log("ChatWindow.js: pollForResponse - Polling stopped after response"); // Log: Polling stopped after response
                }
            }, 2000); // Poll every 2 seconds
        };

        startPolling();
        return () => {
            clearInterval(pollingInterval);
            console.log("ChatWindow.js: Polling useEffect - Polling interval cleared"); // Log: Polling interval cleared on unmount
        }; // Cleanup on unmount
    }, [sessionWebhook, currentSession]);


    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="chat-window-container">
            <div className="user-info">
                Logged in as: {user?.email}
                <button onClick={handleSignOut} className="sign-out-button">Sign Out</button>
            </div>
            <div className="chat-window">
                {messages.map((message, index) => (
                    <Message key={index} message={message} />
                ))}
            </div>
            <InputArea onSendMessage={sendMessage} isSending={isSending} newMessage={newMessage} setNewMessage={setNewMessage} />
        </div>
    );
};

export default ChatWindow;
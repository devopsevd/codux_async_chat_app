import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import InputArea from './InputArea';
import Message from './Message';

const ChatWindow = ({ sessionId, isSessionActive, onSessionTerminated }) => {
    const [messages, setMessages] = useState([]);
    const [sessionWebhook, setSessionWebhook] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState(null);
    const [currentSession, setCurrentSession] = useState(null);
    const [webhookFetched, setWebhookFetched] = useState(false); // NEW STATE to track webhook fetch

    const fetchMessagesFromDatabase = async () => {
        console.log("ChatWindow.js: fetchMessagesFromDatabase - Fetching messages from database...");
        try {
            const response = await fetch(`http://localhost:3001/api/messages/${sessionWebhook.split('/').pop()}`, {
                headers: {
                    Authorization: `Bearer ${currentSession?.access_token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("ChatWindow.js: fetchMessagesFromDatabase - Messages data received from DB:", data);

            setMessages(data.messages);

        } catch (error) {
            console.error('Error fetching messages from database:', error);
            alert('Failed to load chat history. Please refresh and try again.');
        }
    };


    useEffect(() => {
        console.log("ChatWindow.js: useEffect - Auth state change listener setup");
        console.log("supabase.auth object:", supabase.auth);
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log("ChatWindow.js: supabase.auth.getSession() - Initial session:", session);
            setUser(session?.user);
            setCurrentSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            console.log("ChatWindow.js: supabase.auth.onAuthStateChange - Auth state changed:", _event, session);
            setUser(session?.user);
            setCurrentSession(session);
        });
    }, []);

    useEffect(() => {
        const fetchSessionWebhook = async () => {
            if (!user || !currentSession) {
                setSessionWebhook('');
                console.log("ChatWindow.js: fetchSessionWebhook - No user, clearing sessionWebhook");
                setWebhookFetched(false); // Reset webhookFetched when no user
                return;
            }
            if (sessionWebhook) {
                console.log("ChatWindow.js: fetchSessionWebhook - Session webhook already set, skipping fetch.");
                setWebhookFetched(true); // Webhook is already set
                return;
            }
            console.log("ChatWindow.js: fetchSessionWebhook - Fetching session webhook...");
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
                console.log("ChatWindow.js: fetchSessionWebhook - Webhook URL received:", data.webhookUrl);
                setWebhookFetched(true); // Webhook fetched successfully

            } catch (error) {
                console.error('Error fetching session webhook:', error);
                alert('Failed to start session. Please refresh and try again.');
                setWebhookFetched(false); // Webhook fetch failed
            }
        };

        fetchSessionWebhook();
    }, [user, currentSession]);


    // Fetch messages only after webhook is fetched
    useEffect(() => {
        if (webhookFetched && sessionWebhook) {
            console.log("ChatWindow.js: useEffect - webhookFetched is true, now fetching messages...");
            fetchMessagesFromDatabase();
        } else {
            console.log("ChatWindow.js: useEffect - webhookFetched is false or no sessionWebhook, skipping fetchMessagesFromDatabase");
        }
    }, [webhookFetched, sessionWebhook]);


    const sendMessage = async (messageText) => {
        if (newMessage.trim() === '' || isSending) return;
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
            console.log("ChatWindow.js: Polling useEffect - No sessionWebhook, skipping polling");
            return;
        }

        let pollingInterval;
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

                if (response.ok) {
                    if (response.status === 204 || !response.headers.get('content-length')) {
                        console.log("ChatWindow.js: pollForResponse - Received 204 No Content - No AI Response yet");
                        return false;
                    } else {
                        const data = await response.json();
                        console.log("ChatWindow.js: pollForResponse - Response Data from Backend:", JSON.stringify(data));
                        if (data && data.response) {
                            const alreadyExists = messages.some(msg => msg.text === data.response && msg.sender === 'AI');
                            if (!alreadyExists) {
                                setMessages(prevMessages => [...prevMessages, { text: data.response, sender: 'AI' }]);
                                console.log("ChatWindow.js: pollForResponse - AI Response received and added:", data.response);
                            } else {
                                console.log("ChatWindow.js: pollForResponse - AI Response already exists, not adding again:", data.response);
                            }
                            return true;
                        } else {
                            console.log("ChatWindow.js: pollForResponse - No 'data.response' found in response:", data);
                        }
                    }
                } else if (response.status === 400) {
                    console.log("ChatWindow.js: pollForResponse - Received 400 (Session inactive). Stopping polling.");
                    return true;
                } else {
                    console.log("ChatWindow.js: pollForResponse - HTTP Response NOT OK:", response.status, response.statusText);
                    console.error(`Webhook poll failed with status: ${response.status}`);
                }
            } catch (error) {
                console.error('Error polling webhook:', error);
            }
            return false;
        };

        const startPolling = async () => {
            console.log("ChatWindow.js: startPolling - Starting webhook polling for:", sessionWebhook);
            pollingInterval = setInterval(async () => {
                if (await pollForResponse()) {
                    // clearInterval(pollingInterval); // Keep polling for more responses
                    console.log("ChatWindow.js: pollForResponse - AI Response received, but polling continues for more responses...");
                }
            }, 2000);
        };

        startPolling();
        return () => {
            clearInterval(pollingInterval);
            console.log("ChatWindow.js: Polling useEffect - Polling interval cleared");
        };
    }, [sessionWebhook, currentSession, messages]);

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
                {messages.length === 0 && user && <div className="no-messages">No messages yet. Start the conversation!</div>}
                {messages.map((message, index) => (
                    <Message key={index} message={message} />
                ))}
            </div>
            <InputArea onSendMessage={sendMessage} isSending={isSending} newMessage={newMessage} setNewMessage={setNewMessage} />
        </div>
    );
};

export default ChatWindow;
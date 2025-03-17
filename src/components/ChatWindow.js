import React, { useState, useEffect, useRef } from 'react'; // **Import useRef**
import { supabase } from '../supabaseClient';
import InputArea from './InputArea';
import Message from './Message';

const ChatWindow = ({ sessionId, isSessionActive, onSessionTerminated }) => { // **CHANGED: Props to receive sessionId and session status**
    const [messages, setMessages] = useState([]);
    const [sessionWebhook, setSessionWebhook] = useState(''); // Might not be needed here anymore
    const [isSending, setIsSending] = useState(false);
    // const [newMessage, setNewMessage] = useState('');
    const [currentSession, setCurrentSession] = useState(null);
    const [webhookFetched, setWebhookFetched] = useState(false);
    const chatWindowRef = useRef(null); // **CREATE ref for chat window div**
    const [isPollingActive, setIsPollingActive] = useState(false);


    const fetchMessagesFromDatabase = async () => {
        if (!sessionId) return; // **Guard clause: Exit if no sessionId**
        console.log(`ChatWindow.js: fetchMessagesFromDatabase - Fetching messages for session ${sessionId} from database...`);
        try {
            const response = await fetch(`http://localhost:3001/api/messages/${sessionId}`, { // Use sessionId prop
                headers: {
                    Authorization: `Bearer ${currentSession?.access_token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("ChatWindow.js: fetchMessagesFromDatabase - Messages data received from DB for session ${sessionId}:", data);


            // setMessages(data.messages) // **MODIFIED: Create new message objects with sender property**
            // **MODIFIED: Create new message objects with sender and unique key**
            const formattedMessages = data.messages.map((msg, index) => ({ // **Include index in map**
                key: `${index}-${msg.id}`, // **NEW: Create unique key using index and message id**
                text: msg.text,
                sender: msg.sender
            }));
            setMessages(formattedMessages); // **Set state with the new array of formatted messages**

        } catch (error) {
            console.error('Error fetching messages from database:', error);
            alert('Failed to load chat history. Please refresh and try again.');
        }
    };


    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setCurrentSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentSession(session);
        });
    }, []);


    useEffect(() => {
        if (sessionId && currentSession) { // **Fetch messages when sessionId and session are available**
            fetchMessagesFromDatabase();
        } else {
            setMessages([]); // Clear messages if no sessionId
        }
    }, [sessionId, currentSession]); // **Dependency on sessionId**


    const sendMessage = async (messageText) => {
        if (!isSessionActive  || isSending) return; // **Guard: Check if session is active**
        setIsSending(true);
        try {
            const response = await fetch('http://localhost:3001/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentSession?.access_token}`,
                },
                body: JSON.stringify({ message: messageText, webhookUrl: `/webhook/session/${sessionId}` }), // Construct webhookUrl here
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setMessages([...messages, { text: messageText, sender: 'You' }]);
            // setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const terminateSession = async () => {
        if (!sessionId) return;
        try {
            const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/terminate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${currentSession?.access_token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('Session terminated successfully');
            onSessionTerminated(sessionId); // Notify parent component about termination
            alert('Session terminated.');
        } catch (error) {
            console.error('Error terminating session:', error);
            alert('Failed to terminate session.');
        }
    };


    // Polling for AI response (similar to previous, but sessionId is prop now)
    useEffect(() => {
        if (!sessionId || !isSessionActive) { // **Guard clause: Check session active**
            console.log("ChatWindow.js: Polling useEffect - No sessionId or session inactive or polling already active, skipping polling setup");
            return;
        }

        let pollingInterval;
        const pollForResponse = async () => {
            try {
                const pollingURL = `http://localhost:3001/webhook/session/${sessionId}`;
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
                            const aiResponse = data.response;
                            const sender = 'AI';
                            const alreadyExists = messages.some(msg => msg.text === aiResponse && msg.sender === sender);
                            console.log("ChatWindow.js: pollForResponse - Current messages state before check:", messages); // **LOG: Current messages state**
                            console.log("ChatWindow.js: pollForResponse - Checking if AI response already exists:", alreadyExists, "Response:", aiResponse); // **LOG: alreadyExists check**

                            if (!alreadyExists) {
                                const newMessage = { text: aiResponse, sender: sender, key: `${messages.length}-${sessionId}-${Date.now()}` }; // **NEW: Generate key here**
                                setMessages(prevMessages => {
                                    const updatedMessages = [...prevMessages, newMessage];
                                    console.log("ChatWindow.js: pollForResponse - Messages state *after* adding new AI response:", updatedMessages); // **LOG: State after update**
                                    return updatedMessages;
                                });
                                console.log("ChatWindow.js: pollForResponse - AI Response received and added:", aiResponse, "Key:", newMessage.key); // **Log the key**
                            } else {
                                console.log("ChatWindow.js: pollForResponse - AI Response already exists, not adding again:", aiResponse);
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

        // const pollForResponse = async () => {
        //     try {
        //         const pollingURL = `http://localhost:3001/webhook/session/${sessionId}`; // Use sessionId prop
        //         console.log("ChatWindow.js: pollForResponse - Polling URL:", pollingURL);
        //
        //         const response = await fetch(pollingURL, {
        //             headers: {
        //                 Authorization: `Bearer ${currentSession?.access_token}`,
        //             },
        //         });
        //
        //         console.log("ChatWindow.js: pollForResponse - HTTP Response Status:", response.status, response.statusText);
        //         console.log("ChatWindow.js: pollForResponse - response.ok:", response.ok);
        //
        //         if (response.ok) {
        //             if (response.status === 204 || !response.headers.get('content-length')) {
        //                 console.log("ChatWindow.js: pollForResponse - Received 204 No Content - No AI Response yet");
        //                 return false;
        //             } else {
        //                 const data = await response.json();
        //                 console.log("ChatWindow.js: pollForResponse - Response Data from Backend:", JSON.stringify(data));
        //                 if (data && data.response) {
        //                     const aiResponse = data.response;
        //                     const sender = 'AI';
        //                     const alreadyExists = messages.some(msg => msg.text === data.response && msg.sender === 'AI');
        //                     console.log("ChatWindow.js: pollForResponse - Current messages state before check:", messages); // **LOG: Current messages state**
        //                     console.log("ChatWindow.js: pollForResponse - Checking if AI response already exists:", alreadyExists, "Response:", aiResponse); // **LOG: alreadyExists check**
        //                     if (!alreadyExists) {
        //                         const newMessage = { text: aiResponse, sender: sender, key: `${messages.length}-${sessionId}-${Date.now()}` }; // **NEW: Generate key here**
        //                         setMessages(prevMessages => [...prevMessages, { text: data.response, sender: 'AI' }]);
        //                         console.log("ChatWindow.js: pollForResponse - AI Response received and added:", data.response);
        //                     } else {
        //                         console.log("ChatWindow.js: pollForResponse - AI Response already exists, not adding again:", data.response);
        //                     }
        //                     return true;
        //                 } else {
        //                     console.log("ChatWindow.js: pollForResponse - No 'data.response' found in response:", data);
        //                 }
        //             }
        //         } else if (response.status === 400) {
        //             console.log("ChatWindow.js: pollForResponse - Received 400 (Session inactive). Stopping polling.");
        //             return true;
        //         } else {
        //             console.log("ChatWindow.js: pollForResponse - HTTP Response NOT OK:", response.status, response.statusText);
        //             console.error(`Webhook poll failed with status: ${response.status}`);
        //         }
        //     } catch (error) {
        //         console.error('Error polling webhook:', error);
        //     }
        //     return false;
        // };

        const startPolling = async () => {
            console.log("ChatWindow.js: startPolling - Starting webhook polling for session:", sessionId);
            setIsPollingActive(true); // **NEW: Set
            pollingInterval = setInterval(async () => {
                if (await pollForResponse()) {
                    console.log("ChatWindow.js: pollForResponse - AI Response received, polling continues...");
                }
            }, 2000);
        };

        startPolling();
        return () => {
            clearInterval(pollingInterval);
            console.log("ChatWindow.js: Polling useEffect - Polling interval cleared for session:", sessionId);
            setIsPollingActive(false); // **NEW: Set polling status to inactive on cleanup**
        };
    }, [sessionId, currentSession, isSessionActive]); // **Dependency on isSessionActive**

    // **NEW useEffect - Auto-scroll to bottom on new messages**
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]); // **Dependency on messages array**

    return (
        <div className="chat-window-container">
            {isSessionActive && (
                <div className="user-info session-actions">
                    <button onClick={terminateSession} className="terminate-session-button">Terminate Session</button>
                </div>
            )}

            <div className="chat-window" ref={chatWindowRef}>
                {messages.length === 0 && sessionId && <div className="no-messages">No messages in this session yet.</div>}
                {messages.map((message, index) => ( // **MODIFIED: Removed index from map, using key from message object**
                    <Message key={message.key} message={message} />  // **MODIFIED: Use message.key as key prop**
                ))}
            </div>
            {isSessionActive && (
                <InputArea onSendMessage={sendMessage} isSending={isSending}/>
            )}
            {!isSessionActive && messages.length > 0 && (
                <div className="session-closed-message">Session Closed. Chat history is read-only.</div>
            )}
        </div>
    );
};

export default ChatWindow;
import React, { useState } from 'react';

const InputArea = ({ onSendMessage, isSending }) => {
    const [newMessage, setNewMessage] = useState(''); // **NEW: Local newMessage state in InputArea**
    const handleSendMessage = () => {
        onSendMessage(newMessage);
        setNewMessage(''); // **Clear local newMessage state after sending**

    };

    return (
        <div className="input-area">
            <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSending}
                onKeyPress={(event) => {
                    if (event.key === 'Enter' && !isSending) {
                        handleSendMessage();
                    }
                }}
            />
            <button onClick={handleSendMessage} disabled={isSending}>
                Send
            </button>
        </div>
    );
};

export default InputArea;
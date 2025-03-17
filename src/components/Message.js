import React from 'react';

const Message = ({ message }) => { // **REMOVED React.memo wrapper**
    console.log("Message Component - message prop:", message); // **Keep the log for debugging**
    return (
        <div className={`message ${message.sender === 'You' ? 'sent' : 'received'}`}>
            <div className="message-content">{message.text}</div>
            <div className="message-sender">{message.sender}</div>
        </div>
    );
}; // **REMOVED React.memo wrapper - Message is now a regular functional component**

export default Message;
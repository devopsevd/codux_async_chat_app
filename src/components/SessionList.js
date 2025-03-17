import React from 'react';

const SessionList = ({ sessions, onSessionSelect, active }) => {
    const sessionStatus = active ? 'Active Sessions' : 'Closed Sessions';

    return (
        <div className="session-list-container">
            <h3>{sessionStatus}</h3>
            <ul className="session-list">
                {sessions.map(session => (
                    <li key={session.id} className="session-item" onClick={() => onSessionSelect(session)}>
                        Session ID: {session.id} {/* You can display more user-friendly session info here if available */}
                        <br/>
                        Created: {new Date(session.created_at).toLocaleString()}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SessionList;
"use client";

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebaseConfig';

const StudentChat = ({ adminUID }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [userUID, setUserUID] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserUID(user.uid); // Set user UID if user is authenticated
            } else {
                setUserUID(null);
                setError('You must be logged in to send messages');
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (userUID) {
            const messagesRef = collection(firestore, 'chats');
            const q = query(
                messagesRef,
                where('participants', 'array-contains', userUID),
                orderBy('createdAt', 'asc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setMessages(msgs);
            }, (error) => setError(error.message));

            return () => unsubscribe();
        }
    }, [userUID]);

    const handleSendMessage = async () => {
        if (!message.trim()) {
            setError("Message can't be empty");
            return;
        }
        if (!userUID) {
            setError('User authentication is required to send messages');
            return;
        }

        try {
            await addDoc(collection(firestore, 'chats'), {
                participants: [userUID, adminUID],
                message,
                senderUID: userUID,
                createdAt: new Date().toISOString(),
            });
            setMessage(''); // Clear message input after sending
        } catch (error) {
            console.error('Error sending message:', error);
            setError('Failed to send message');
        }
    };

    return (
        <div>
            <h2>Chat with Admin</h2>
            <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {messages.length > 0 ? (
                    messages.map((msg) => (
                        <div key={msg.id} style={{ textAlign: msg.senderUID === userUID ? 'right' : 'left' }}>
                            <p><strong>{msg.senderUID === userUID ? 'You' : 'Admin'}:</strong> {msg.message}</p>
                            <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
                        </div>
                    ))
                ) : (
                    <p>No messages yet. Start the conversation!</p>
                )}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
            />
            <button onClick={handleSendMessage}>Send</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default StudentChat;

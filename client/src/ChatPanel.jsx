import { useState } from 'react';

export default function ChatPanel({ messages, onSend, className = '' }) {
  const [text, setText] = useState('');

  function submit(event) {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned) return;
    onSend(cleaned);
    setText('');
  }

  return (
    <section className={`chat ${className}`.trim()}>
      <h2>Table talk</h2>
      <ol className="messages">
        {messages.length === 0 && <li className="quiet">Say what you see. Clues still go through the clue box.</li>}
        {messages.map((message) => (
          <li key={message.id}>
            <strong>{message.name}</strong>
            <span>{message.text}</span>
          </li>
        ))}
      </ol>
      <form onSubmit={submit}>
        <input
          value={text}
          maxLength={200}
          placeholder="Message the room"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="back">Send</button>
      </form>
    </section>
  );
}

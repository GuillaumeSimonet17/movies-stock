import { useState, useEffect, useRef } from 'react';
import './EmojiPicker.css';

const CATEGORIES = [
  {
    label: 'Cinema',
    emojis: ['🎬', '🎭', '🎥', '📽️', '🎞️', '🍿', '🎦', '🎠', '🎡', '🎢', '🎪', '🎟️', '🎫'],
  },
  {
    label: 'Genres',
    emojis: ['👻', '😱', '💀', '🔪', '🤠', '🚀', '🛸', '🐉', '⚔️', '🕵️', '💘', '😂', '🤣', '😭', '🦸', '🦹'],
  },
  {
    label: 'Mood',
    emojis: ['⭐', '🌟', '💫', '🔥', '❤️', '💙', '💚', '💜', '🖤', '🤍', '💯', '🏆', '🥇', '👑', '💎', '✨'],
  },
  {
    label: 'Objects',
    emojis: ['📚', '📖', '📝', '🎵', '🎶', '🎸', '🎹', '🏠', '🌍', '🌊', '🌙', '☀️', '🌈', '🍕', '🍺', '☕'],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={ref}>
      <div className="emoji-picker-tabs">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            className={`emoji-tab${activeCategory === i ? ' active' : ''}`}
            onClick={() => setActiveCategory(i)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="emoji-picker-grid">
        {CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            className="emoji-btn"
            onClick={() => { onSelect(emoji); onClose(); }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

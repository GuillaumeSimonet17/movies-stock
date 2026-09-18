import { useEffect, useRef } from 'react';
import './EmojiPicker.css';

const CATEGORIES = [
  {
    label: 'Cinema',
    emojis: ['🎬', '🎭', '🎥', '📽️', '🎞️', '🍿', '🎦', '🎪', '🎟️', '🎫', '🎠', '🎡', '🎢', '🎰', '🕹️', '👁️'],
  },
  {
    label: 'Genres',
    emojis: ['👻', '😱', '💀', '🔪', '🩸', '🤠', '🚀', '🛸', '🐉', '⚔️', '🕵️', '💘', '😂', '🤣', '😭', '🦸', '🦹', '🧙', '🧟', '🧛', '🐺', '👽', '🤖', '🦊', '🐍', '🦁', '🐯', '🔮', '🧨', '💣', '🎯', '🃏'],
  },
  {
    label: 'Mood',
    emojis: ['⭐', '🌟', '💫', '✨', '🔥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯', '🏆', '🥇', '🥈', '🥉', '👑', '💎', '🎖️', '🏅', '🎗️', '🌙', '☀️', '🌈', '⚡', '🌊', '❄️', '🍀'],
  },
  {
    label: 'Objects',
    emojis: ['📚', '📖', '📝', '📓', '📔', '🗒️', '📜', '🎵', '🎶', '🎸', '🎹', '🥁', '🎷', '🎺', '🎻', '🎤', '🎧', '📻', '📺', '💻', '📱', '🔭', '🔬', '🗺️', '🧭', '🏠', '🏰', '🗼', '🌍', '✈️', '🚗', '🛳️', '🍕', '🍺', '🍷', '☕', '🎂'],
  },
  {
    label: 'Nature',
    emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '🍁', '🍂', '🌿', '🌱', '🌵', '🎋', '🎍', '🍄', '🦋', '🐝', '🦅', '🦉', '🐬', '🐋', '🦈', '🐊', '🦖', '🌋', '🏔️', '🏝️', '🌅', '🌃', '🌌', '🌠', '🌪️', '🌊'],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
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
      <div className="emoji-picker-scroll">
        {CATEGORIES.map((cat) => (
          <div key={cat.label} className="emoji-category">
            <div className="emoji-category-label">{cat.label}</div>
            <div className="emoji-picker-grid">
              {cat.emojis.map((emoji) => (
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
        ))}
      </div>
    </div>
  );
}

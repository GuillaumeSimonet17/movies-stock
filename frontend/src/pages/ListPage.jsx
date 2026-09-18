import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TopBar from '../components/common/TopBar';
import MovieCard from '../components/common/MovieCard';
import ListSearchBar from '../components/movies/ListSearchBar';
import EmojiPicker from '../components/common/EmojiPicker';
import { listService } from '../services/listService';
import './WatchedPage.css';
import './ListPage.css';

function SortableMovieItem({ movie, listMovies, listId, onRemoveClick }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: movie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="watched-movie-item" {...attributes}>
      <div className="movie-card-wrapper">
        <button
          ref={setActivatorNodeRef}
          className="drag-handle"
          {...listeners}
          onClick={(e) => e.preventDefault()}
          title="Drag to reorder"
        >
          ⠿
        </button>
        <MovieCard movie={movie} movieList={listMovies} from="watched" extraState={{ sourceListId: listId }} />
        <button
          className="remove-button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveClick(movie); }}
          title="Remove from list"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listData, setListData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showDeleteListDialog, setShowDeleteListDialog] = useState(false);
  const [movieToRemove, setMovieToRemove] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const nameInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reorderTimeoutRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    loadList();
  }, [id]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await listService.getList(id);
      setListData(data);
      setNameInput(data.name);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleIconSelect = async (emoji) => {
    const prev = listData.icon;
    setListData(d => ({ ...d, icon: emoji }));
    try {
      await listService.updateList(id, { name: listData.name, icon: emoji });
    } catch {
      setListData(d => ({ ...d, icon: prev }));
      showToast('Failed to update icon', 'error');
    }
  };

  const handleRenameSave = async () => {
    const name = nameInput.trim();
    if (!name || name === listData.name) { setEditingName(false); return; }
    try {
      const updated = await listService.renameList(id, name);
      setListData(prev => ({ ...prev, name: updated.name }));
      setEditingName(false);
      showToast('List renamed');
    } catch {
      showToast('Failed to rename list', 'error');
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameSave();
    if (e.key === 'Escape') { setEditingName(false); setNameInput(listData.name); }
  };

  const handleDeleteList = async () => {
    try {
      await listService.deleteList(id);
      setShowDeleteListDialog(false);
      navigate('/');
    } catch {
      showToast('Failed to delete list', 'error');
    }
  };

  const removingRef = useRef(new Set());

  const handleRemoveClick = (movie) => {
    setMovieToRemove(movie);
  };

  const handleConfirmRemove = async () => {
    if (!movieToRemove) return;
    const movie = movieToRemove;
    setMovieToRemove(null);
    await handleRemoveMovie(movie.id);
  };

  const handleRemoveMovie = useCallback(async (movieId) => {
    if (removingRef.current.has(movieId)) return;
    removingRef.current.add(movieId);
    setListData(prev => {
      if (!prev) return prev;
      return { ...prev, movies: prev.movies.filter(m => m.id !== movieId) };
    });
    try {
      await listService.removeMovie(id, movieId);
    } catch {
      await loadList();
      showToast('Failed to remove movie', 'error');
    } finally {
      removingRef.current.delete(movieId);
    }
  }, [id]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setListData(prev => {
      const oldIndex = prev.movies.findIndex(m => m.id === active.id);
      const newIndex = prev.movies.findIndex(m => m.id === over.id);
      const newMovies = arrayMove(prev.movies, oldIndex, newIndex);

      clearTimeout(reorderTimeoutRef.current);
      reorderTimeoutRef.current = setTimeout(() => {
        listService.reorderList(id, newMovies.map(m => m.id)).catch(() => {});
      }, 600);

      return { ...prev, movies: newMovies };
    });
  };

  if (loading) {
    return (
      <div className="watched-page">
        <TopBar />
        <div className="loading-container">Loading list...</div>
      </div>
    );
  }

  return (
    <div className="watched-page">
      <TopBar />
      <div className="content">
        <div className="watched-header list-page-header">
          {editingName ? (
            <div className="list-rename-row">
              <input
                ref={nameInputRef}
                className="list-rename-input"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameSave}
              />
            </div>
          ) : (
            <div className="list-title-row">
              <div className="list-icon-wrapper" ref={emojiPickerRef}>
                <button className="list-emoji-btn" onClick={() => setShowEmojiPicker(v => !v)} title="Change icon">
                  {listData.icon || '🎬'}
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={handleIconSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <h1>{listData.name}</h1>
              <button className="list-icon-btn" onClick={() => setEditingName(true)} title="Rename list">✎</button>
              <button className="list-icon-btn list-icon-btn--danger" onClick={() => setShowDeleteListDialog(true)} title="Delete list">🗑</button>
            </div>
          )}
        </div>

        <ListSearchBar listId={id} onMovieAdded={(movie) => setListData(prev => ({ ...prev, movies: [movie, ...prev.movies] }))} />

        {listData.movies.length === 0 ? (
          <div className="empty-state">
            <h2>Empty list</h2>
            <p>Search and add movies above.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={listData.movies.map(m => m.id)} strategy={rectSortingStrategy}>
              <div className="movies-wrap">
                {listData.movies.map(movie => (
                  <SortableMovieItem
                    key={movie.id}
                    movie={movie}
                    listMovies={listData.movies}
                    listId={id}
                    onRemoveClick={handleRemoveClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {movieToRemove && (
        <div className="confirm-dialog-overlay" onClick={() => setMovieToRemove(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Remove from list?</h3>
            <p>Are you sure you want to remove <strong>{movieToRemove.title || movieToRemove.name}</strong> from this list?</p>
            <div className="dialog-actions">
              <button className="btn-cancel" onClick={() => setMovieToRemove(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleConfirmRemove}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteListDialog && (
        <div className="confirm-dialog-overlay" onClick={() => setShowDeleteListDialog(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete list?</h3>
            <p>Are you sure you want to delete <strong>{listData.name}</strong>? This cannot be undone.</p>
            <div className="dialog-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteListDialog(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleDeleteList}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}

export default ListPage;

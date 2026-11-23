import { BookmarkSimple } from '@phosphor-icons/react';

export default function Bookmark({ active, onClick, name }) {
  return (
    <button
      className={`icon-button save ${active ? 'is-saved' : ''}`}
      aria-label={`${active ? '取消收藏' : '收藏'}${name}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <BookmarkSimple size={22} weight={active ? 'fill' : 'light'} />
    </button>
  );
}

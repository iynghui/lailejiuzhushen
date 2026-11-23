import { money } from '../model.js';

export default function RentRange({ min, max, className }) {
  return (
    <div className={className}>
      <small>¥</small>
      <span>{money(min)}</span>
      {min !== max && (
        <>
          <span className="range-word">至</span>
          <span>{money(max)}</span>
        </>
      )}
      <small>/ 月</small>
    </div>
  );
}

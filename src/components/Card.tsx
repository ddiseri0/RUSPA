import { Card as CardType } from '../engine/types';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isTargeted?: boolean;
  onClick?: () => void;
  hidden?: boolean;
}

export const Card = ({ card, isSelected, isTargeted, onClick, hidden = false }: CardProps) => {
  if (hidden) return <div className="card-wrapper card-back"></div>;
  
  let suitStyle = '';
  let suitSymbol = '';
  if (card.suit === 'denari') { suitStyle = 'card-denari'; suitSymbol = '🪙'; }
  if (card.suit === 'coppe') { suitStyle = 'card-coppe';  suitSymbol = '🏆'; }
  if (card.suit === 'spade') { suitStyle = 'card-spade';  suitSymbol = '⚔️'; }
  if (card.suit === 'bastoni') { suitStyle = 'card-bastoni'; suitSymbol = '🪵'; }

  return (
    <div className={`card-wrapper ${isSelected ? 'card-selected' : ''} ${isTargeted ? 'card-opponent-target' : ''}`} onClick={onClick}>
      <div className="card-value">{card.value === 1 ? 'A' : card.value}</div>
      <div className={`card-suit ${suitStyle}`}>{suitSymbol}</div>
    </div>
  );
};

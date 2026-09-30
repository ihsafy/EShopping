import {
  FaUserTie,
  FaLaptop,
  FaPlug,
  FaSprayCan,
  FaUtensils,
  FaCouch,
  FaRunning,
  FaShoppingBag,
  FaDumbbell,
  FaGlasses,
  FaMagic,
  FaBoxOpen,
} from 'react-icons/fa';

/** Explicit map keeps the icon bundle small (no namespace import). */
const ICONS = {
  FaUserTie,
  FaLaptop,
  FaPlug,
  FaSprayCan,
  FaUtensils,
  FaCouch,
  FaRunning,
  FaShoppingBag,
  FaDumbbell,
  FaGlasses,
  FaMagic,
  FaBoxOpen,
};

export default function CategoryIcon({ name, size = 22, ...rest }) {
  const Icon = ICONS[name] || FaBoxOpen;
  return <Icon size={size} {...rest} />;
}

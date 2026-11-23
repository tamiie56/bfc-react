import { FaMinus, FaPlus } from "react-icons/fa";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function QtyStepper({ value, onChange, min = 1, max = 99 }: Props) {
  return (
    <div className="qty">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(value - 1)} disabled={value <= min}>
        <FaMinus />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(value + 1)} disabled={value >= max}>
        <FaPlus />
      </button>
    </div>
  );
}

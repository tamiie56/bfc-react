import { useOpenStatus } from "../hooks/useOpenStatus";

export default function OpenStatus() {
  const { open, label } = useOpenStatus();
  return (
    <span className={`status ${open ? "status--open" : "status--closed"}`}>
      <i aria-hidden /> {label}
    </span>
  );
}

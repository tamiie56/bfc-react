import { useCountUp } from "../hooks/useCountUp";

interface Props {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export default function CountUp({ end, duration = 1600, prefix = "", suffix = "" }: Props) {
  const { ref, value } = useCountUp(end, duration);
  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

import Section from './common/Section';
import RangeInput from './common/RangeInput';

export default function RatesPanel({ rates, onChange }) {
  const update = (axis, value) => {
    onChange({ ...rates, [axis]: value });
  };

  return (
    <Section title="Rates" defaultCollapsed={false}>
      <RangeInput label="Roll" value={rates.roll} onChange={v => update('roll', v)} min={0} max={1000} step={10} unit=" deg/s" />
      <RangeInput label="Pitch" value={rates.pitch} onChange={v => update('pitch', v)} min={0} max={1000} step={10} unit=" deg/s" />
      <RangeInput label="Yaw" value={rates.yaw} onChange={v => update('yaw', v)} min={0} max={500} step={5} unit=" deg/s" />
    </Section>
  );
}

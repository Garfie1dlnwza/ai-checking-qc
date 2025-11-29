interface InputGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function InputGroup({ label, value, onChange }: InputGroupProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
      />
    </div>
  );
}

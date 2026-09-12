type Props = {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
};

export function SubmitButton({ pending, children, pendingLabel }: Props) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bevel min-h-[52px] w-full cursor-pointer bg-brand px-7 font-cond text-base font-bold uppercase tracking-[0.06em] text-graphite transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-progress disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

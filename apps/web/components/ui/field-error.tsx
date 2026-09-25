export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="text-[11px] text-red-400">
      {messages[0]}
    </p>
  );
}

export const ErrorState = ({ message, correlationId }: { message: string; correlationId?: string }) => (
  <div className="banner">
    {message}
    {correlationId ? ` (Ref: ${correlationId})` : ''}
  </div>
);

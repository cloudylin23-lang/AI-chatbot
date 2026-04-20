export default function LoadingIndicator() {
  return (
    <div className="loading-row">
      <div className="bubble-avatar ai">AI</div>
      <div className="loading-bubble">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  );
}
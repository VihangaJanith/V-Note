export default function Alert({ message, type = "info" }) {
  const alertStyles = {
    info: "bg-blue-100 border-blue-500 text-blue-700",
    success: "bg-green-100 border-green-500 text-green-700",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-700",
    error: "bg-red-100 border-red-500 text-red-700",
  };

  return (
    <div
      style={{
        zIndex: 9999,
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        position: "fixed",
      }}
      className={` absolute border-l-4 bottom-1 right-2 p-4 mb-1  text-sm ${alertStyles[type]} rounded min-w-56`}
      role="alert"
    >
      {message}
    </div>
  );
}

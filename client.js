const socket = new WebSocket("ws://localhost:3081");
socket.addEventListener("message", (event) => {
  if (event.data === "RELOAD") {
    window.location.reload();
  }
});
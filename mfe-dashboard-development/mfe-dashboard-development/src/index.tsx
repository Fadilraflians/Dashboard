// Module Federation async boundary. The real bootstrap is loaded dynamically
// so shared modules initialize first. This entry only runs in standalone dev;
// inside the shell the exposed `./mount` is used instead.
import("./bootstrap");

export {};

// Module Federation async boundary — ensures shared modules (react) initialize
// before the real bootstrap runs. Standalone-only; consumers load the exposed
// modules directly via the remote.
import("./bootstrap");

export {};

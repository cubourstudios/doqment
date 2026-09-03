// Shared PDF header/footer/type scale. @react-pdf/renderer is client-only —
// every file importing it starts with "use client" (CLAUDE.md §6, known
// constraint 1). Noto Sans must be registered before rendering any PDF
// (constraint 2). Implemented in the backend integration phase.
export {};

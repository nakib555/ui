# Refactoring Diagram

This document outlines the refactoring of large files into smaller, logical modules. Each original file exceeding 100 lines has been broken down to improve maintainability and readability.

---

### 1. `src/components/App.tsx`

The main `App` component was broken down into a container/view pattern using a custom hook to manage its complex logic.

**New Structure:**

```
src/components/App.tsx
    └── (File removed, content moved to `src/components/App/index.tsx`)

src/components/App/
    ├── index.tsx           # The new main App component (View)
    ├── useAppLogic.ts      # Custom hook with state, effects, and handlers (Logic)
    ├── AppModals.tsx       # Component that renders all modals
    └── constants.ts        # Default values for settings
```

---

### 2. `src/components/Chat/AiMessage.tsx`

The `AiMessage` component, responsible for rendering AI responses, contained complex logic for parsing, state management, and rendering various sub-components. This has been streamlined.

**New Structure:**

```
src/components/Chat/AiMessage.tsx
    └── (File removed, content moved to `src/components/Chat/AiMessage/index.tsx`)

src/components/Chat/AiMessage/
    ├── index.tsx               # The new AiMessage component (View)
    └── useAiMessageLogic.ts    # Custom hook for all state and memoization
```

---

### 3. `src/hooks/useChat.ts`

The `useChat` hook contained all logic for sending messages, handling the agentic loop, managing history, and executing tools. It has been broken down by concern.

**New Structure:**

```
src/hooks/useChat.ts
    └── (File removed, content moved to `src/hooks/useChat/index.ts`)

src/hooks/useChat/
    ├── index.ts              # The main useChat hook, composing other parts
    ├── chat-callbacks.ts     # Defines callbacks for the agentic loop
    ├── history-builder.ts    # Logic for constructing the API message history
    └── tool-executor.ts      # Wrapper function for executing tools
```

---

### 4. `src/services/agenticLoop.ts`

The core agentic loop logic was a single large function. It has been split to separate the API call from the stream processing.

**New Structure:**

```
src/services/agenticLoop.ts
    └── (File removed, content moved to `src/services/agenticLoop/index.ts`)

src/services/agenticLoop/
    ├── index.ts              # Main agentic loop orchestrator
    └── stream-processor.ts   # Handles processing the stream of responses
```

---

### 5. `src/utils/exportUtils.ts`

The chat export utilities were split into separate files for each format.

**New Structure:**

```
src/utils/exportUtils.ts
    └── (File removed, content moved to `src/utils/exportUtils/index.ts`)

src/utils/exportUtils/
    ├── index.ts        # Re-exports all export functions
    ├── markdown.ts     # Logic for Markdown export and clipboard
    ├── json.ts         # Logic for JSON export
    └── pdf.ts          # Logic for PDF export
```

---

### 6. CSS Files (`main.css`, `markdown.css`)

Large CSS files were split into parts and re-combined using `@import` to maintain a single entry point.

**New Structure:**

```
src/styles/main.css
    └── @import './main.part1.css';
        @import './main.part2.css';

src/styles/markdown.css
    └── @import './markdown.part1.css';
        @import './markdown.part2.css';
```

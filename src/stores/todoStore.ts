'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // To persist state

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: TodoItem[];
  addTodo: (text: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  getTodoById: (id: string) => TodoItem | undefined;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      addTodo: (text: string) =>
        set((state) => ({
          todos: [
            ...state.todos,
            { id: Date.now().toString(), text, completed: false },
          ],
        })),
      removeTodo: (id: string) =>
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        })),
      toggleTodo: (id: string) =>
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          ),
        })),
      getTodoById: (id: string) => get().todos.find(todo => todo.id === id),
    }),
    {
      name: 'todo-storage', // Name for localStorage key
      storage: createJSONStorage(() => localStorage), // Use localStorage
    }
  )
);

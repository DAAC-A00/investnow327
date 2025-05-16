'use client';

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Box,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTodoStore, TodoItem } from '@/stores/todoStore';

export default function TodoPage() {
  const { todos, addTodo, removeTodo, toggleTodo } = useTodoStore();
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          To-Do List
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, marginBottom: 2 }}>
          <TextField
            label="New To-Do"
            variant="outlined"
            fullWidth
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddTodo();
              }
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleAddTodo}
            startIcon={<AddIcon />}
            sx={{ height: '56px' }} // Match TextField height
          >
            Add
          </Button>
        </Box>

        {todos.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}>
            No tasks yet. Add a new task above!
          </Typography>
        )}

        <List>
          {todos.map((todo: TodoItem, index: number) => (
            <React.Fragment key={todo.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => removeTodo(todo.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <Checkbox
                  edge="start"
                  checked={todo.completed}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-labelledby': `todo-item-label-${todo.id}` }}
                  onChange={() => toggleTodo(todo.id)}
                />
                <ListItemText
                  id={`todo-item-label-${todo.id}`}
                  primary={todo.text}
                  sx={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
                />
              </ListItem>
              {index < todos.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

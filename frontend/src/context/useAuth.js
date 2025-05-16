// src/context/useAuth.js
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export const useAuth = () => useContext(AuthContext);
// This code defines a custom hook `useAuth` that provides access to the authentication context. It uses the `useContext` hook from React to retrieve the current value of the `AuthContext`, allowing components to easily access authentication-related data and functions.

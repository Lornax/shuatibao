import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProfileList } from './pages/ProfileList';
import { ProfileCreate } from './pages/ProfileCreate';
import { ProfileDetail } from './pages/ProfileDetail';
import { QuestionAdd } from './pages/QuestionAdd';
import { Quiz } from './pages/Quiz';
import { WrongBook } from './pages/WrongBook';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/profiles" replace /> },
  { path: '/profiles', element: <ProfileList /> },
  { path: '/profiles/new', element: <ProfileCreate /> },
  { path: '/profiles/:pid', element: <ProfileDetail /> },
  { path: '/profiles/:pid/questions/new', element: <QuestionAdd /> },
  { path: '/profiles/:pid/quiz', element: <Quiz /> },
  { path: '/profiles/:pid/wrongbook', element: <WrongBook /> },
]);

import { ProfileList } from './pages/ProfileList';

export default function App() {
  return (
    <div className="min-h-full bg-paper p-6 max-w-md mx-auto space-y-4">
      <h1 className="font-display text-4xl">学不死</h1>
      <ProfileList />
    </div>
  );
}

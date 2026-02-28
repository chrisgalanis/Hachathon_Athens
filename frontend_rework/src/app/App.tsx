import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  return (
    <div className="relative w-full min-h-screen bg-[#0a0a0f]">
      {/* Mobile frame wrapper - max 430px */}
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#0a0a0f] shadow-2xl">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}
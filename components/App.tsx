// import { LogoutButton } from "@/components/logout-button";
import { CurrentUserAvatar } from "@/components/current-user-avatar";

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="fixed top-4 right-4">
        <CurrentUserAvatar />
      </div>
    </div>
  );
}

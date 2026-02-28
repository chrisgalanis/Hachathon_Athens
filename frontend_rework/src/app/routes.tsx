import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { FeedPage } from "./pages/FeedPage";
import { ChatbotPage } from "./pages/ChatbotPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { ProgressPage } from "./pages/ProgressPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/feed",
    Component: FeedPage,
  },
  {
    path: "/chatbot",
    Component: ChatbotPage,
  },
  {
    path: "/subjects",
    Component: SubjectsPage,
  },
  {
    path: "/progress",
    Component: ProgressPage,
  },
]);

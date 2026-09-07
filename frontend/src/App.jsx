import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Problems from "./pages/Problems.jsx";
import Challenges from "./pages/Challenges.jsx";
import ChallengeDetail from "./pages/ChallengeDetail.jsx";
import Startups from "./pages/Startups.jsx";
import StartupProfile from "./pages/StartupProfile.jsx";
import Pilots from "./pages/Pilots.jsx";
import PilotDetail from "./pages/PilotDetail.jsx";
import Validation from "./pages/Validation.jsx";
import ScaleUp from "./pages/ScaleUp.jsx";
import RagAssistant from "./pages/RagAssistant.jsx";
import GraphExplorer from "./pages/GraphExplorer.jsx";
import ApplicationDetail from "./pages/ApplicationDetail.jsx";
import Applications from "./pages/Applications.jsx";
import Evaluations from "./pages/Evaluations.jsx";
import EvaluationRedirect from "./pages/EvaluationRedirect.jsx";
import {
  ApplicationsPage,
  ContractsPage,
  EvaluationsPage,
  AnalyticsPage,
  ScaleUpPage,
  ValidationPage,
} from "./pages/OperationalPages.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
        <Route path="/startups" element={<Startups />} />
        <Route path="/startups/:startupId" element={<StartupProfile />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:applicationId" element={<ApplicationDetail />} />
        <Route path="/evaluations" element={<Evaluations />} />
        <Route path="/evaluations/:evaluationId" element={<EvaluationRedirect />} />
        <Route path="/pilots" element={<Pilots />} />
        <Route path="/pilots/:pilotId" element={<PilotDetail />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/validation" element={<Validation />} />
        <Route path="/validation/:pilotId" element={<Validation />} />
        <Route path="/scale-up" element={<ScaleUp />} />
        <Route path="/scale-up/:pilotId" element={<ScaleUp />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/assistant" element={<RagAssistant />} />
        <Route path="/graph" element={<GraphExplorer />} />
      </Routes>
    </Layout>
  );
}

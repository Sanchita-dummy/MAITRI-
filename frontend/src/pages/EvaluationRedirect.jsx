import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";

export default function EvaluationRedirect() {
  const { evaluationId } = useParams();
  const [applicationId, setApplicationId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getEvaluations()
      .then((evaluations) => {
        const evaluation = evaluations.find((item) => item.evaluation_id === evaluationId);
        if (evaluation) setApplicationId(evaluation.application_id);
        else setError("Evaluation not found");
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message));
  }, [evaluationId]);

  if (applicationId) return <Navigate to={`/applications/${applicationId}`} replace />;
  if (error) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load evaluation: {error}</div>;
  return <Loading label="Loading evaluation..." />;
}

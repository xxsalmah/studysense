import { useEffect, useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";

import "./App.css";

const API_URL = "https://studysense-whnc.onrender.com";

function AIPrediction({ subjectAnalytics }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedData = useMemo(() => {
    return subjectAnalytics.find(
      (subject) =>
        String(subject.id) ===
        String(selectedSubjectId)
    );
  }, [
    subjectAnalytics,
    selectedSubjectId,
  ]);

  const getPrediction = async () => {

    if (!selectedData) {
      setError("Please select a subject first.");
      return;
    }

    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const response = await fetch(
        `${API_URL}/api/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            subject_id: selectedData.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Prediction failed"
        );
      }

      setPrediction(
        data.predicted_score
      );

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="form-panel ai-panel">

      <div className="panel-header">

        <div>

          <h2>
            🤖 AI Performance Prediction
          </h2>

          <p className="ai-description">
            Estimate your expected performance
            based on your study habits.
          </p>

        </div>

      </div>

      <div className="ai-form">

        <div className="input-group">

          <label>
            Select Subject
          </label>

          <select
            value={selectedSubjectId}
            onChange={(e) => {

              setSelectedSubjectId(
                e.target.value
              );

              setPrediction(null);
              setError("");

            }}
          >

            <option value="">
              Choose a subject
            </option>

            {subjectAnalytics.map(
              (subject) => (

                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.name}
                </option>

              )
            )}

          </select>

        </div>

        {selectedData && (

          <div className="ai-data-preview">

            <div>

              <span>
                Study Hours
              </span>

              <strong>
                {(
                  selectedData.studyMinutes /
                  60
                ).toFixed(1)}
              </strong>

            </div>

            <div>

              <span>
                Study Sessions
              </span>

              <strong>
                {selectedData.sessionCount}
              </strong>

            </div>

            <div>

              <span>
                Average Session
              </span>

              <strong>

                {selectedData.sessionCount > 0
                  ? (
                      selectedData.studyMinutes /
                      selectedData.sessionCount
                    ).toFixed(0)
                  : 0}{" "}
                min

              </strong>

            </div>

            <div>

              <span>
                Assessments
              </span>

              <strong>
                {selectedData.scoreCount}
              </strong>

            </div>

            <div>

              <span>
                Target Score
              </span>

              <strong>

                {selectedData.targetScore
                  ? `${selectedData.targetScore}%`
                  : "—"}

              </strong>

            </div>

          </div>

        )}

      </div>

      <button
        className="ai-button"
        onClick={getPrediction}
        disabled={
          loading ||
          !selectedData
        }
      >

        {loading
          ? "Analyzing..."
          : "Predict My Performance"}

      </button>

      {error && (

        <div className="ai-error">
          {error}
        </div>

      )}

      {prediction !== null && (

        <div className="prediction-result">

          <div className="prediction-icon">
            🤖
          </div>

          <div>

            <span>
              Predicted Performance
            </span>

            <h1>
              {Number(prediction).toFixed(1)}%
            </h1>

            <p>
              Based on your current study patterns
              for {selectedData?.name}.
            </p>

          </div>

        </div>

      )}

      {!selectedData && (

        <p className="ai-description">
          Select a subject to automatically use
          its existing study and assessment data.
        </p>

      )}

    </div>
  );
}

function App() {

  // =========================
  // STATE
  // =========================

  const [page, setPage] = useState("dashboard");

  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [scores, setScores] = useState([]);
  const [features, setFeatures] = useState([]);

  const [modelPerformance, setModelPerformance] =
    useState(null);

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    target_score: "",
  });

  const [sessionForm, setSessionForm] = useState({
    subject_id: "",
    topic: "",
    duration: "",
    date: "",
  });

  const [scoreForm, setScoreForm] = useState({
    subject_id: "",
    assessment: "",
    score: "",
    max_score: "",
    date: "",
  });

  // =========================
  // LOAD DATA
  // =========================

  const loadData = async () => {

    try {

      const [
        subjectsResponse,
        sessionsResponse,
        scoresResponse,
        featuresResponse,
        modelPerformanceResponse,
      ] = await Promise.all([

        fetch(`${API_URL}/api/subjects`),

        fetch(`${API_URL}/api/sessions`),

        fetch(`${API_URL}/api/scores`),

        fetch(
          `${API_URL}/api/analytics/features`
        ),

        fetch(
          `${API_URL}/api/model-performance`
        ),

      ]);

      const subjectsData =
        await subjectsResponse.json();

      const sessionsData =
        await sessionsResponse.json();

      const scoresData =
        await scoresResponse.json();

      const featuresData =
        await featuresResponse.json();

      const modelPerformanceData =
        await modelPerformanceResponse.json();

      setSubjects(subjectsData);

      setSessions(sessionsData);

      setScores(scoresData);

      setFeatures(featuresData);

      if (modelPerformanceResponse.ok) {

        setModelPerformance(
          modelPerformanceData
        );

      }

    } catch (error) {

      console.error(
        "Failed to load data:",
        error
      );

    }
  };

  useEffect(() => {

    loadData();

  }, []);

  // =========================
  // ADD SUBJECT
  // =========================

  const addSubject = async (event) => {

    event.preventDefault();

    if (!subjectForm.name.trim()) {
      return;
    }

    try {

      const response = await fetch(
        `${API_URL}/api/subjects`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: subjectForm.name,

            target_score:
              subjectForm.target_score
                ? Number(
                    subjectForm.target_score
                  )
                : null,
          }),
        }
      );

      if (!response.ok) {

        throw new Error(
          "Failed to add subject"
        );

      }

      setSubjectForm({
        name: "",
        target_score: "",
      });

      await loadData();

    } catch (error) {

      console.error(error);

    }
  };

  // =========================
  // ADD STUDY SESSION
  // =========================

  const addSession = async (event) => {

    event.preventDefault();

    try {

      const response = await fetch(
        `${API_URL}/api/sessions`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({

            subject_id:
              Number(
                sessionForm.subject_id
              ),

            topic:
              sessionForm.topic,

            duration:
              Number(
                sessionForm.duration
              ),

            date:
              sessionForm.date,

          }),
        }
      );

      if (!response.ok) {

        const errorData =
          await response.json();

        throw new Error(
          errorData.error ||
          "Failed to add session"
        );

      }

      setSessionForm({
        subject_id: "",
        topic: "",
        duration: "",
        date: "",
      });

      await loadData();

    } catch (error) {

      console.error(error);

    }
  };

  // =========================
  // ADD SCORE
  // =========================

  const addScore = async (event) => {

    event.preventDefault();

    try {

      const response = await fetch(
        `${API_URL}/api/scores`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({

            subject_id:
              Number(
                scoreForm.subject_id
              ),

            assessment:
              scoreForm.assessment,

            score:
              Number(
                scoreForm.score
              ),

            max_score:
              Number(
                scoreForm.max_score
              ),

            date:
              scoreForm.date,

          }),
        }
      );

      if (!response.ok) {

        const errorData =
          await response.json();

        throw new Error(
          errorData.error ||
          "Failed to add score"
        );

      }

      setScoreForm({
        subject_id: "",
        assessment: "",
        score: "",
        max_score: "",
        date: "",
      });

      await loadData();

    } catch (error) {

      console.error(error);

    }
  };

  // =========================
  // HELPERS
  // =========================

  const getSubjectName = (subjectId) => {

    const subject =
      subjects.find(
        (item) =>
          item.id === subjectId
      );

    return subject
      ? subject.name
      : "Unknown";
  };

  // =========================
  // GENERAL STATS
  // =========================

  const totalMinutes = sessions.reduce(
    (total, session) =>
      total +
      Number(session.duration),
    0
  );

  const totalHours =
    totalMinutes / 60;

  const averageSession =
    sessions.length > 0
      ? totalMinutes /
        sessions.length
      : 0;

  const averageScore =
    scores.length > 0
      ? scores.reduce(
          (total, score) =>
            total +
            Number(
              score.percentage
            ),
          0
        ) / scores.length
      : 0;

  // =========================
  // SUBJECT ANALYTICS
  // =========================

  const subjectAnalytics =
    useMemo(() => {

      return subjects.map(
        (subject) => {

          const subjectSessions =
            sessions.filter(
              (session) =>
                session.subject_id ===
                subject.id
            );

          const subjectScores =
            scores.filter(
              (score) =>
                score.subject_id ===
                subject.id
            );

          const studyMinutes =
            subjectSessions.reduce(
              (total, session) =>
                total +
                Number(
                  session.duration
                ),
              0
            );

          const subjectAverageScore =
            subjectScores.length > 0
              ? subjectScores.reduce(
                  (total, score) =>
                    total +
                    Number(
                      score.percentage
                    ),
                  0
                ) /
                subjectScores.length
              : 0;

          return {

            id:
              subject.id,

            name:
              subject.name,

            studyMinutes,

            sessionCount:
              subjectSessions.length,

            scoreCount:
              subjectScores.length,

            averageScore:
              subjectAverageScore,

            targetScore:
              Number(
                subject.target_score
              ) || 0,

          };

        }
      );

    }, [
      subjects,
      sessions,
      scores,
    ]);

  // =========================
  // CHART DATA
  // =========================

  const studyTimeChartData =
    subjectAnalytics.map(
      (subject) => ({

        subject:
          subject.name,

        hours:
          Number(
            (
              subject.studyMinutes /
              60
            ).toFixed(2)
          ),

      })
    );

  const scoreChartData =
    subjectAnalytics
      .filter(
        (subject) =>
          subject.scoreCount > 0
      )
      .map(
        (subject) => ({

          subject:
            subject.name,

          score:
            Number(
              subject.averageScore.toFixed(
                2
              )
            ),

        })
      );

  const sessionTrendData =
    useMemo(() => {

      const grouped = {};

      sessions.forEach(
        (session) => {

          if (
            !grouped[
              session.date
            ]
          ) {

            grouped[
              session.date
            ] = 0;

          }

          grouped[
            session.date
          ] += Number(
            session.duration
          );

        }
      );

      return Object.entries(
        grouped
      )

        .sort(
          ([dateA], [dateB]) =>
            new Date(dateA) -
            new Date(dateB)
        )

        .map(
          ([date, minutes]) => ({

            date,

            hours:
              Number(
                (
                  minutes /
                  60
                ).toFixed(2)
              ),

          })
        );

    }, [sessions]);

  const studyVsScoreData =
    subjectAnalytics

      .filter(
        (subject) =>
          subject.studyMinutes > 0 &&
          subject.scoreCount > 0
      )

      .map(
        (subject) => ({

          subject:
            subject.name,

          studyHours:
            Number(
              (
                subject.studyMinutes /
                60
              ).toFixed(2)
            ),

          score:
            Number(
              subject.averageScore.toFixed(
                2
              )
            ),

        })
      );

  // =========================
  // SMART RECOMMENDATIONS
  // =========================

  const overallAverageStudyMinutes =
    subjectAnalytics.length > 0

      ? subjectAnalytics.reduce(
          (total, subject) =>
            total +
            subject.studyMinutes,
          0
        ) /
        subjectAnalytics.length

      : 0;

  const recommendations =
    useMemo(() => {

      const results = [];

      subjectAnalytics.forEach(
        (subject) => {

          if (
            subject.scoreCount > 0 &&
            subject.targetScore > 0 &&
            subject.averageScore <
              subject.targetScore
          ) {

            results.push({

              type: "high",

              title:
                `${subject.name} needs more attention`,

              text:
                `Your average score is ${subject.averageScore.toFixed(
                  1
                )}%, below your target of ${subject.targetScore}%. Consider increasing focused study time.`,

            });

            return;
          }

          if (
            subject.scoreCount > 0 &&
            subject.averageScore < 60
          ) {

            results.push({

              type: "high",

              title:
                `Improve ${subject.name}`,

              text:
                `Your current average is ${subject.averageScore.toFixed(
                  1
                )}%. Try shorter, consistent study sessions and review difficult topics.`,

            });

            return;
          }

          if (
            subject.scoreCount > 0 &&
            subject.studyMinutes === 0
          ) {

            results.push({

              type: "high",

              title:
                `Study ${subject.name}`,

              text:
                `You have assessment data but no recorded study sessions. Start logging your study time so StudySense can identify useful patterns.`,

            });

            return;
          }

          if (
            subject.studyMinutes > 0 &&
            overallAverageStudyMinutes > 0 &&
            subject.studyMinutes <
              overallAverageStudyMinutes *
                0.5
          ) {

            results.push({

              type: "medium",

              title:
                `Increase study time for ${subject.name}`,

              text:
                `You have recorded less study time for this subject than your other subjects. A more consistent schedule may help.`,

            });

            return;
          }

          if (
            subject.sessionCount > 0 &&
            subject.scoreCount === 0
          ) {

            results.push({

              type: "medium",

              title:
                `Track a score for ${subject.name}`,

              text:
                `You have study sessions recorded but no assessment results yet. Adding scores will help StudySense understand your progress.`,

            });

          }

        }
      );

      if (
        results.length === 0 &&
        subjectAnalytics.some(
          (subject) =>
            subject.scoreCount > 0
        )
      ) {

        results.push({

          type: "good",

          title:
            "Keep up your work",

          text:
            "Your current study and performance data does not show a major issue. Keep recording sessions and assessments so StudySense can learn from your progress.",

        });

      }

      return results.slice(
        0,
        6
      );

    }, [
      subjectAnalytics,
      overallAverageStudyMinutes,
    ]);

  // =========================
  // PAGE: DASHBOARD
  // =========================

  const renderDashboard = () => (

    <div>

      <div className="page-header">

        <div>

          <h1>
            Dashboard
          </h1>

          <p>
            Overview of your study activity
            and academic performance.
          </p>

        </div>

      </div>

      <div className="stats-grid">

        <div className="stat-card">

          <span>
            Total Study Time
          </span>

          <strong>
            {totalHours.toFixed(1)} h
          </strong>

        </div>

        <div className="stat-card">

          <span>
            Average Session
          </span>

          <strong>
            {averageSession.toFixed(0)} min
          </strong>

        </div>

        <div className="stat-card">

          <span>
            Average Score
          </span>

          <strong>
            {averageScore.toFixed(1)}%
          </strong>

        </div>

        <div className="stat-card">

          <span>
            Subjects
          </span>

          <strong>
            {subjects.length}
          </strong>

        </div>

      </div>

      <div className="content-grid">

        <div className="card">

          <div className="card-header">

            <h2>
              Recent Study Sessions
            </h2>

            <button
              onClick={() =>
                setPage("sessions")
              }
            >
              View all
            </button>

          </div>

          {sessions.length === 0 ? (

            <p className="empty-state">
              No study sessions recorded yet.
            </p>

          ) : (

            <div className="data-list">

              {[...sessions]
                .reverse()
                .slice(0, 5)
                .map(
                  (session) => (

                    <div
                      className="data-row"
                      key={session.id}
                    >

                      <div>

                        <strong>
                          {session.topic}
                        </strong>

                        <span>
                          {getSubjectName(
                            session.subject_id
                          )}
                        </span>

                      </div>

                      <div>

                        <strong>
                          {session.duration} min
                        </strong>

                        <span>
                          {session.date}
                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </div>

        <div className="card">

          <div className="card-header">

            <h2>
              Recent Scores
            </h2>

            <button
              onClick={() =>
                setPage("scores")
              }
            >
              View all
            </button>

          </div>

          {scores.length === 0 ? (

            <p className="empty-state">
              No scores recorded yet.
            </p>

          ) : (

            <div className="data-list">

              {[...scores]
                .reverse()
                .slice(0, 5)
                .map(
                  (score) => (

                    <div
                      className="data-row"
                      key={score.id}
                    >

                      <div>

                        <strong>
                          {score.assessment}
                        </strong>

                        <span>
                          {getSubjectName(
                            score.subject_id
                          )}
                        </span>

                      </div>

                      <div>

                        <strong>
                          {score.percentage}%
                        </strong>

                        <span>
                          {score.date}
                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

  // =========================
  // PAGE: SUBJECTS
  // =========================

  const renderSubjects = () => (

    <div>

      <div className="page-header">

        <div>

          <h1>
            Subjects
          </h1>

          <p>
            Manage your subjects and targets.
          </p>

        </div>

      </div>

      <div className="content-grid">

        <div className="card">

          <h2>
            Add Subject
          </h2>

          <form
            className="form"
            onSubmit={addSubject}
          >

            <label>

              Subject name

              <input
                type="text"
                value={
                  subjectForm.name
                }
                onChange={(event) =>
                  setSubjectForm({
                    ...subjectForm,
                    name:
                      event.target.value,
                  })
                }
                placeholder="e.g. Mathematics"
              />

            </label>

            <label>

              Target score (%)

              <input
                type="number"
                min="0"
                max="100"
                value={
                  subjectForm.target_score
                }
                onChange={(event) =>
                  setSubjectForm({
                    ...subjectForm,
                    target_score:
                      event.target.value,
                  })
                }
                placeholder="e.g. 80"
              />

            </label>

            <button
              className="primary-button"
              type="submit"
            >
              Add Subject
            </button>

          </form>

        </div>

        <div className="card">

          <h2>
            Your Subjects
          </h2>

          {subjects.length === 0 ? (

            <p className="empty-state">
              No subjects added yet.
            </p>

          ) : (

            <div className="data-list">

              {subjects.map(
                (subject) => (

                  <div
                    className="data-row"
                    key={subject.id}
                  >

                    <div>

                      <strong>
                        {subject.name}
                      </strong>

                      <span>
                        Target:{" "}
                        {subject.target_score
                          ? `${subject.target_score}%`
                          : "Not set"}
                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

  // =========================
  // PAGE: SESSIONS
  // =========================

  const renderSessions = () => (

    <div>

      <div className="page-header">

        <div>

          <h1>
            Study Sessions
          </h1>

          <p>
            Record when and how you study.
          </p>

        </div>

      </div>

      <div className="content-grid">

        <div className="card">

          <h2>
            Log Study Session
          </h2>

          <form
            className="form"
            onSubmit={addSession}
          >

            <label>

              Subject

              <select
                value={
                  sessionForm.subject_id
                }
                onChange={(event) =>
                  setSessionForm({
                    ...sessionForm,
                    subject_id:
                      event.target.value,
                  })
                }
              >

                <option value="">
                  Select subject
                </option>

                {subjects.map(
                  (subject) => (

                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>

                  )
                )}

              </select>

            </label>

            <label>

              Topic

              <input
                type="text"
                value={
                  sessionForm.topic
                }
                onChange={(event) =>
                  setSessionForm({
                    ...sessionForm,
                    topic:
                      event.target.value,
                  })
                }
                placeholder="e.g. Derivatives"
              />

            </label>

            <label>

              Duration (minutes)

              <input
                type="number"
                min="1"
                value={
                  sessionForm.duration
                }
                onChange={(event) =>
                  setSessionForm({
                    ...sessionForm,
                    duration:
                      event.target.value,
                  })
                }
                placeholder="e.g. 60"
              />

            </label>

            <label>

              Date

              <input
                type="date"
                value={
                  sessionForm.date
                }
                onChange={(event) =>
                  setSessionForm({
                    ...sessionForm,
                    date:
                      event.target.value,
                  })
                }
              />

            </label>

            <button
              className="primary-button"
              type="submit"
            >
              Add Session
            </button>

          </form>

        </div>

        <div className="card">

          <h2>
            Study History
          </h2>

          {sessions.length === 0 ? (

            <p className="empty-state">
              No study sessions yet.
            </p>

          ) : (

            <div className="data-list">

              {[...sessions]
                .reverse()
                .map(
                  (session) => (

                    <div
                      className="data-row"
                      key={session.id}
                    >

                      <div>

                        <strong>
                          {session.topic}
                        </strong>

                        <span>
                          {getSubjectName(
                            session.subject_id
                          )}
                        </span>

                      </div>

                      <div>

                        <strong>
                          {session.duration} min
                        </strong>

                        <span>
                          {session.date}
                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

  // =========================
  // PAGE: SCORES
  // =========================

  const renderScores = () => (

    <div>

      <div className="page-header">

        <div>

          <h1>
            Scores
          </h1>

          <p>
            Track your assessment performance.
          </p>

        </div>

      </div>

      <div className="content-grid">

        <div className="card">

          <h2>
            Add Score
          </h2>

          <form
            className="form"
            onSubmit={addScore}
          >

            <label>

              Subject

              <select
                value={
                  scoreForm.subject_id
                }
                onChange={(event) =>
                  setScoreForm({
                    ...scoreForm,
                    subject_id:
                      event.target.value,
                  })
                }
              >

                <option value="">
                  Select subject
                </option>

                {subjects.map(
                  (subject) => (

                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>

                  )
                )}

              </select>

            </label>

            <label>

              Assessment

              <input
                type="text"
                value={
                  scoreForm.assessment
                }
                onChange={(event) =>
                  setScoreForm({
                    ...scoreForm,
                    assessment:
                      event.target.value,
                  })
                }
                placeholder="e.g. Midterm"
              />

            </label>

            <div className="form-row">

              <label>

                Score

                <input
                  type="number"
                  min="0"
                  value={
                    scoreForm.score
                  }
                  onChange={(event) =>
                    setScoreForm({
                      ...scoreForm,
                      score:
                        event.target.value,
                    })
                  }
                />

              </label>

              <label>

                Maximum

                <input
                  type="number"
                  min="1"
                  value={
                    scoreForm.max_score
                  }
                  onChange={(event) =>
                    setScoreForm({
                      ...scoreForm,
                      max_score:
                        event.target.value,
                    })
                  }
                />

              </label>

            </div>

            <label>

              Date

              <input
                type="date"
                value={
                  scoreForm.date
                }
                onChange={(event) =>
                  setScoreForm({
                    ...scoreForm,
                    date:
                      event.target.value,
                  })
                }
              />

            </label>

            <button
              className="primary-button"
              type="submit"
            >
              Add Score
            </button>

          </form>

        </div>

        <div className="card">

          <h2>
            Score History
          </h2>

          {scores.length === 0 ? (

            <p className="empty-state">
              No scores recorded yet.
            </p>

          ) : (

            <div className="data-list">

              {[...scores]
                .reverse()
                .map(
                  (score) => (

                    <div
                      className="data-row"
                      key={score.id}
                    >

                      <div>

                        <strong>
                          {score.assessment}
                        </strong>

                        <span>
                          {getSubjectName(
                            score.subject_id
                          )}
                        </span>

                      </div>

                      <div>

                        <strong>
                          {score.percentage}%
                        </strong>

                        <span>
                          {score.date}
                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

  // =========================
  // ML DATA SUMMARY
  // =========================

  const renderDataSummary = () => (

    <div className="card data-summary-card">

      <div className="card-header">

        <div>

          <h2>
            ML Data Summary
          </h2>

          <p className="card-description">
            These features are calculated from
            your study sessions and assessments.
            They will become inputs for the
            machine learning stage.
          </p>

        </div>

      </div>

      {features.length === 0 ? (

        <div className="empty-state">

          <p>
            Add subjects, study sessions, and
            scores to generate ML-ready data.
          </p>

        </div>

      ) : (

        <div className="table-wrapper">

          <table className="data-table">

            <thead>

              <tr>

                <th>
                  Subject
                </th>

                <th>
                  Study Hours
                </th>

                <th>
                  Sessions
                </th>

                <th>
                  Avg Session
                </th>

                <th>
                  Assessments
                </th>

                <th>
                  Avg Score
                </th>

                <th>
                  Target
                </th>

                <th>
                  Score Gap
                </th>

              </tr>

            </thead>

            <tbody>

              {features.map(
                (feature) => (

                  <tr
                    key={
                      feature.subject_id
                    }
                  >

                    <td>

                      <strong>
                        {feature.subject}
                      </strong>

                    </td>

                    <td>
                      {feature.study_hours} h
                    </td>

                    <td>
                      {feature.session_count}
                    </td>

                    <td>

                      {
                        feature.average_session_minutes
                      }{" "}
                      min

                    </td>

                    <td>
                      {feature.score_count}
                    </td>

                    <td>
                      {feature.average_score}%
                    </td>

                    <td>

                      {feature.target_score
                        ? `${feature.target_score}%`
                        : "—"}

                    </td>

                    <td>

                      <span
                        className={
                          feature.score_gap >= 0
                            ? "gap-positive"
                            : "gap-negative"
                        }
                      >

                        {feature.score_gap > 0
                          ? "+"
                          : ""}

                        {feature.score_gap}%

                      </span>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

  // =========================
  // PAGE: ANALYTICS
  // =========================

  const renderAnalytics = () => (

    <div>

      <div className="page-header">

        <div>

          <h1>
            Analytics
          </h1>

          <p>
            Understand the relationship between
            your study habits and performance.
          </p>

        </div>

      </div>

      <AIPrediction
        subjectAnalytics={
          subjectAnalytics
        }
      />

      {/* MODEL PERFORMANCE */}

      <div className="card">

        <div className="card-header">

          <div>

            <h2>
              Model Performance
            </h2>

            <p className="card-description">
              Evaluation results from the
              machine learning model.
            </p>

          </div>

        </div>

        {!modelPerformance ? (

          <p className="empty-state">
            Model performance data is not
            available yet.
          </p>

        ) : (

          <div className="stats-grid">

            <div className="stat-card">

              <span>
                Mean Absolute Error
              </span>

              <strong>

                {modelPerformance.mae !== null
                  ? `${modelPerformance.mae.toFixed(
                      2
                    )} points`
                  : "—"}

              </strong>

            </div>

            <div className="stat-card">

              <span>
                R² Score
              </span>

              <strong>

                {modelPerformance.r2 !== null
                  ? modelPerformance.r2.toFixed(
                      2
                    )
                  : "Not enough data"}

              </strong>

            </div>

            <div className="stat-card">

              <span>
                Training Examples
              </span>

              <strong>
                {
                  modelPerformance.training_examples
                }
              </strong>

            </div>

            <div className="stat-card">

              <span>
                Testing Examples
              </span>

              <strong>
                {
                  modelPerformance.testing_rows
                }
              </strong>

            </div>

          </div>

        )}

        {modelPerformance && (

          <p className="card-description">

            Status:{" "}

            <strong>
              {modelPerformance.status}
            </strong>

            {modelPerformance.r2 === null && (
              <>

                {" "}

                Add more subjects with assessment
                scores to produce a meaningful
                R² evaluation.

              </>
            )}

          </p>

        )}

      </div>

      {/* SMART RECOMMENDATIONS */}

      <div className="card recommendations-panel">

        <div className="card-header">

          <div>

            <h2>
              Smart Study Recommendations
            </h2>

            <p className="card-description">
              Suggestions based on your current
              study and performance data.
            </p>

          </div>

        </div>

        {recommendations.length === 0 ? (

          <p className="empty-state">
            Add more study and assessment data
            to generate recommendations.
          </p>

        ) : (

          <div className="recommendations-list">

            {recommendations.map(
              (
                recommendation,
                index
              ) => (

                <div
                  className={`recommendation-card recommendation-${recommendation.type}`}
                  key={index}
                >

                  <div className="recommendation-icon">

                    {recommendation.type ===
                    "high"
                      ? "!"
                      : recommendation.type ===
                        "medium"
                      ? "↗"
                      : "✓"}

                  </div>

                  <div className="recommendation-content">

                    <div className="recommendation-heading">

                      <strong>
                        {
                          recommendation.title
                        }
                      </strong>

                      <span
                        className={`recommendation-priority priority-${recommendation.type}`}
                      >

                        {recommendation.type ===
                        "high"
                          ? "High"
                          : recommendation.type ===
                            "medium"
                          ? "Medium"
                          : "Good"}

                      </span>

                    </div>

                    <p>
                      {
                        recommendation.text
                      }
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

      {/* ML DATA */}

      {renderDataSummary()}

      {/* CHART 1 */}

      <div className="card">

        <h2>
          Study Time by Subject
        </h2>

        <div className="chart-container">

          {studyTimeChartData.length ===
          0 ? (

            <p className="empty-state">
              Add study sessions to see
              this chart.
            </p>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <BarChart
                data={
                  studyTimeChartData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="subject"
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="hours"
                  name="Study Hours"
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>

      {/* CHART 2 */}

      <div className="card">

        <h2>
          Average Score by Subject
        </h2>

        <div className="chart-container">

          {scoreChartData.length ===
          0 ? (

            <p className="empty-state">
              Add scores to see this chart.
            </p>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <BarChart
                data={
                  scoreChartData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="subject"
                />

                <YAxis
                  domain={[0, 100]}
                />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="score"
                  name="Average Score (%)"
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>

      {/* CHART 3 */}

      <div className="card">

        <h2>
          Study Time Over Time
        </h2>

        <div className="chart-container">

          {sessionTrendData.length ===
          0 ? (

            <p className="empty-state">
              Add study sessions to see
              your study trend.
            </p>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <LineChart
                data={
                  sessionTrendData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="date"
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="hours"
                  name="Study Hours"
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>

      {/* CHART 4 */}

      <div className="card">

        <h2>
          Study Time vs Performance
        </h2>

        <div className="chart-container">

          {studyVsScoreData.length <
          1 ? (

            <p className="empty-state">
              Add both study sessions and
              scores to see this relationship.
            </p>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <ScatterChart>

                <CartesianGrid />

                <XAxis
                  type="number"
                  dataKey="studyHours"
                  name="Study Hours"
                />

                <YAxis
                  type="number"
                  dataKey="score"
                  name="Score"
                  domain={[0, 100]}
                />

                <Tooltip
                  cursor={{
                    strokeDasharray:
                      "3 3",
                  }}
                />

                <Scatter
                  name="Subjects"
                  data={
                    studyVsScoreData
                  }
                />

              </ScatterChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>

      {/* PERFORMANCE */}

      <div className="analytics-grid">

        <div className="card">

          <h2>
            Performance by Subject
          </h2>

          {subjectAnalytics.length ===
          0 ? (

            <p className="empty-state">
              No subject data yet.
            </p>

          ) : (

            <div className="analytics-list">

              {subjectAnalytics.map(
                (subject) => (

                  <div
                    className="analytics-item"
                    key={subject.id}
                  >

                    <div className="analytics-item-header">

                      <strong>
                        {subject.name}
                      </strong>

                      <span>

                        {subject.scoreCount > 0
                          ? `${subject.averageScore.toFixed(
                              1
                            )}%`
                          : "No score"}

                      </span>

                    </div>

                    <div className="progress-bar">

                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(
                            subject.averageScore,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        <div className="card">

          <h2>
            Study Time by Subject
          </h2>

          {subjectAnalytics.length ===
          0 ? (

            <p className="empty-state">
              No subject data yet.
            </p>

          ) : (

            <div className="analytics-list">

              {subjectAnalytics.map(
                (subject) => (

                  <div
                    className="analytics-item"
                    key={subject.id}
                  >

                    <div className="analytics-item-header">

                      <strong>
                        {subject.name}
                      </strong>

                      <span>

                        {(
                          subject.studyMinutes /
                          60
                        ).toFixed(1)}{" "}
                        h

                      </span>

                    </div>

                    <div className="progress-bar">

                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(
                            (
                              subject.studyMinutes /
                              Math.max(
                                totalMinutes,
                                1
                              )
                            ) *
                              100,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

  // =========================
  // PAGE ROUTER
  // =========================

  const renderPage = () => {

    switch (page) {

      case "subjects":
        return renderSubjects();

      case "sessions":
        return renderSessions();

      case "scores":
        return renderScores();

      case "analytics":
        return renderAnalytics();

      default:
        return renderDashboard();

    }

  };

  // =========================
  // APP LAYOUT
  // =========================

  return (

    <div className="app">

      <aside className="sidebar">

        <div className="logo">

          <div className="logo-mark">
            SS
          </div>

          <div>

            <strong>
              StudySense
            </strong>

            <span>
              Study Analytics
            </span>

          </div>

        </div>

        <nav>

          <button
            className={
              page === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setPage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={
              page === "subjects"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setPage("subjects")
            }
          >
            Subjects
          </button>

          <button
            className={
              page === "sessions"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setPage("sessions")
            }
          >
            Study Sessions
          </button>

          <button
            className={
              page === "scores"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setPage("scores")
            }
          >
            Scores
          </button>

          <button
            className={
              page === "analytics"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setPage("analytics")
            }
          >
            Analytics
          </button>

        </nav>

        <div className="sidebar-footer">

          <span>
            Study smarter.
          </span>

          <span>
            Track your progress.
          </span>

        </div>

      </aside>

      <main className="main-content">

        {renderPage()}

      </main>

    </div>

  );
}

export default App;
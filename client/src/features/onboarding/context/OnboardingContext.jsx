import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useSelector } from "react-redux";

import { useAuth } from "../../../context/AuthContext";
import OnboardingTourOverlay from "../components/OnboardingTourOverlay";
import { getTourStepsByRole, TOUR_ROLE } from "../constants/tourSteps";
import {
  getOnboardingStorageKey,
  readOnboardingRecord,
  writeOnboardingRecord,
} from "../utils/onboardingStorage";
import { OnboardingContext } from "./onboardingContextState";

const normalizeRole = (role) => {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "owner" || normalized === "admin") return TOUR_ROLE.OWNER;
  if (normalized) return TOUR_ROLE.MEMBER;
  return null;
};

const clampStepIndex = (value, maxIndex) => {
  if (maxIndex < 0) return 0;
  return Math.min(Math.max(Number(value) || 0, 0), maxIndex);
};

const isMainRoute = (pathname = "") => String(pathname).startsWith("/main");

const getRoleFromTimeline = (timeline = []) => {
  if (!Array.isArray(timeline) || timeline.length === 0) return null;

  const workspaceRoles = timeline
    .filter((item) => item?.type === "workspace")
    .map((item) => normalizeRole(item?.permissions?.role || item?.userRole))
    .filter(Boolean);

  if (workspaceRoles.length === 0) return null;
  return workspaceRoles.some((role) => role === TOUR_ROLE.OWNER) ? TOUR_ROLE.OWNER : TOUR_ROLE.MEMBER;
};

export const OnboardingProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const overviewTimeline = useSelector((state) => state.overview?.overviewData?.timeline || []);

  const userId = String(user?._id || user?.id || "");
  const storageKey = useMemo(() => getOnboardingStorageKey(userId), [userId]);

  const detectedRole = useMemo(() => {
    const fromTimeline = getRoleFromTimeline(overviewTimeline);
    if (fromTimeline) return fromTimeline;
    return normalizeRole(user?.role) || TOUR_ROLE.MEMBER;
  }, [overviewTimeline, user?.role]);

  const [tourRole, setTourRole] = useState(TOUR_ROLE.MEMBER);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const initializedForUserRef = useRef("");

  const steps = useMemo(() => getTourStepsByRole(tourRole), [tourRole]);
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] || null;

  const persistRecord = useCallback(
    (updates = {}) => {
      if (!storageKey) return;

      const existing = readOnboardingRecord(storageKey) || {};
      const now = new Date().toISOString();

      writeOnboardingRecord(storageKey, {
        role: tourRole,
        status: "active",
        stepIndex: 0,
        startedAt: existing.startedAt || now,
        updatedAt: now,
        completedAt: existing.completedAt || null,
        skippedAt: existing.skippedAt || null,
        ...existing,
        ...updates,
      });
    },
    [storageKey, tourRole]
  );

  const startTour = useCallback(
    ({ reset = false, role } = {}) => {
      if (!storageKey || !userId) return;

      const existing = readOnboardingRecord(storageKey);
      const nextRole =
        normalizeRole(role)
        || detectedRole
        || normalizeRole(existing?.role)
        || TOUR_ROLE.MEMBER;
      const roleSteps = getTourStepsByRole(nextRole);
      if (roleSteps.length === 0) return;

      const resumedIndex = clampStepIndex(existing?.stepIndex, roleSteps.length - 1);
      const nextIndex = reset ? 0 : resumedIndex;

      setTourRole(nextRole);
      setStepIndex(nextIndex);
      setIsTourOpen(true);

      const now = new Date().toISOString();
      writeOnboardingRecord(storageKey, {
        role: nextRole,
        status: "active",
        stepIndex: nextIndex,
        startedAt: existing?.startedAt || now,
        updatedAt: now,
        completedAt: null,
        skippedAt: null,
      });
    },
    [detectedRole, storageKey, userId]
  );

  const restartTour = useCallback(() => {
    startTour({ reset: true });
  }, [startTour]);

  const completeTour = useCallback(() => {
    const finalStep = Math.max(totalSteps - 1, 0);
    setStepIndex(finalStep);
    setIsTourOpen(false);
    persistRecord({
      status: "completed",
      stepIndex: finalStep,
      completedAt: new Date().toISOString(),
      skippedAt: null,
    });
  }, [persistRecord, totalSteps]);

  const skipTour = useCallback(() => {
    const safeIndex = clampStepIndex(stepIndex, Math.max(totalSteps - 1, 0));
    setIsTourOpen(false);
    persistRecord({
      status: "skipped",
      stepIndex: safeIndex,
      skippedAt: new Date().toISOString(),
    });
  }, [persistRecord, stepIndex, totalSteps]);

  const nextStep = useCallback(() => {
    if (totalSteps === 0) return;
    if (stepIndex >= totalSteps - 1) {
      completeTour();
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    persistRecord({
      status: "active",
      stepIndex: nextIndex,
      skippedAt: null,
    });
  }, [completeTour, persistRecord, stepIndex, totalSteps]);

  const previousStep = useCallback(() => {
    if (totalSteps === 0) return;
    if (stepIndex <= 0) return;

    const previousIndex = stepIndex - 1;
    setStepIndex(previousIndex);
    persistRecord({
      status: "active",
      stepIndex: previousIndex,
    });
  }, [persistRecord, stepIndex, totalSteps]);

  const resumeTour = useCallback(() => {
    if (!storageKey) return;

    const existing = readOnboardingRecord(storageKey);
    if (!existing || existing.status !== "active") {
      startTour({ reset: true });
      return;
    }

    startTour({ reset: false, role: existing.role });
  }, [startTour, storageKey]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      initializedForUserRef.current = "";
      setTourRole(TOUR_ROLE.MEMBER);
      setStepIndex(0);
      setIsTourOpen(false);
      return;
    }

    if (!isMainRoute(location.pathname)) return;
    if (initializedForUserRef.current === userId) return;

    const existing = readOnboardingRecord(storageKey);
    if (!existing) {
      setTourRole(detectedRole);
      setStepIndex(0);
      setIsTourOpen(true);

      const now = new Date().toISOString();
      writeOnboardingRecord(storageKey, {
        role: detectedRole,
        status: "active",
        stepIndex: 0,
        startedAt: now,
        updatedAt: now,
      });
    } else {
      const nextRole = normalizeRole(existing.role) || detectedRole || TOUR_ROLE.MEMBER;
      const existingSteps = getTourStepsByRole(nextRole);
      const safeIndex = clampStepIndex(existing.stepIndex, existingSteps.length - 1);

      setTourRole(nextRole);
      setStepIndex(safeIndex);
      setIsTourOpen(existing.status === "active");
    }

    initializedForUserRef.current = userId;
  }, [detectedRole, isAuthenticated, location.pathname, storageKey, userId]);

  useEffect(() => {
    if (!isTourOpen || !currentStep?.route) return;

    const currentPath = String(location.pathname || "");
    const targetPath = String(currentStep.route || "");

    if (!targetPath) return;
    if (currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)) return;

    navigate(targetPath);
  }, [currentStep?.route, isTourOpen, location.pathname, navigate]);

  useEffect(() => {
    if (totalSteps === 0) {
      setIsTourOpen(false);
      return;
    }

    if (stepIndex > totalSteps - 1) {
      setStepIndex(totalSteps - 1);
    }
  }, [stepIndex, totalSteps]);

  const contextValue = useMemo(
    () => ({
      isTourOpen,
      tourRole,
      currentStep,
      currentStepIndex: stepIndex,
      totalSteps,
      progressPercent: totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0,
      startTour,
      restartTour,
      resumeTour,
      nextStep,
      previousStep,
      skipTour,
      completeTour,
    }),
    [
      completeTour,
      currentStep,
      isTourOpen,
      nextStep,
      previousStep,
      restartTour,
      resumeTour,
      skipTour,
      startTour,
      stepIndex,
      totalSteps,
      tourRole,
    ]
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      <OnboardingTourOverlay
        isOpen={isTourOpen}
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrevious={previousStep}
        onSkip={skipTour}
      />
    </OnboardingContext.Provider>
  );
};

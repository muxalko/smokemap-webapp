"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { v4 as uuid } from "uuid";

import {
  createSubmissionV3,
  finalizeSubmissionV3,
  type SubmissionActionResult,
} from "./actions";
import {
  M3SubmissionSchema,
  type M3SubmissionInput,
  type ValidatedM3SubmissionInput,
} from "./m3-schema";

export type SubmissionFailureOperation = "validation" | "create" | "finalize";

export type SubmissionProgress = {
  phase: "idle" | "creating" | "finalizing" | "pending" | "failed";
  submissionId?: string;
  failure?: {
    operation: SubmissionFailureOperation;
    code: string;
    field?: string;
  };
};

type SubmissionOperation = {
  input: ValidatedM3SubmissionInput;
  createKey: string;
  finalizeKey: string;
  submissionId?: string;
};

type SubmissionContextValue = {
  progress: SubmissionProgress;
  active: boolean;
  submit: (input: M3SubmissionInput) => boolean;
  retry: () => boolean;
  dismiss: () => void;
};

const initialProgress: SubmissionProgress = { phase: "idle" };
const SubmissionContext = createContext<SubmissionContextValue | null>(null);

function failedProgress(
  operation: SubmissionFailureOperation,
  result: SubmissionActionResult,
  submissionId?: string
): SubmissionProgress {
  return result.ok
    ? initialProgress
    : {
        phase: "failed",
        submissionId,
        failure: {
          operation,
          code: result.code,
          ...(result.field ? { field: result.field } : {}),
        },
      };
}

export function SubmissionProvider({ children }: PropsWithChildren) {
  const [progress, setProgress] = useState<SubmissionProgress>(initialProgress);
  const operationRef = useRef<SubmissionOperation | null>(null);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setProgressIfMounted = useCallback((next: SubmissionProgress) => {
    if (mountedRef.current) setProgress(next);
  }, []);

  const run = useCallback(
    async (operation: SubmissionOperation) => {
      if (!operation.submissionId) {
        setProgressIfMounted({ phase: "creating" });
        let created: SubmissionActionResult;
        try {
          created = await createSubmissionV3(
            operation.input,
            operation.createKey
          );
        } catch {
          created = { ok: false, code: "SUBMISSION_CREATE_FAILED" };
        }
        if (!created.ok) {
          activeRef.current = false;
          setProgressIfMounted(failedProgress("create", created));
          return;
        }
        operation.submissionId = created.submission.id;
      }

      const submissionId = operation.submissionId;
      if (!mountedRef.current) {
        activeRef.current = false;
        return;
      }
      setProgressIfMounted({ phase: "finalizing", submissionId });
      let finalized: SubmissionActionResult;
      try {
        finalized = await finalizeSubmissionV3(
          submissionId,
          operation.finalizeKey
        );
      } catch {
        finalized = { ok: false, code: "SUBMISSION_FINALIZE_FAILED" };
      }
      activeRef.current = false;
      if (!finalized.ok) {
        setProgressIfMounted(
          failedProgress("finalize", finalized, submissionId)
        );
        return;
      }
      operationRef.current = null;
      setProgressIfMounted({
        phase: "pending",
        submissionId: finalized.submission.id,
      });
    },
    [setProgressIfMounted]
  );

  const submit = useCallback(
    (input: M3SubmissionInput) => {
      if (activeRef.current || operationRef.current) return false;
      const parsed = M3SubmissionSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setProgressIfMounted({
          phase: "failed",
          failure: {
            operation: "validation",
            code: "INVALID_SUBMISSION",
            field: String(issue?.path[0] ?? "submission"),
          },
        });
        return false;
      }

      const operation: SubmissionOperation = {
        input: parsed.data,
        createKey: uuid(),
        finalizeKey: uuid(),
      };
      operationRef.current = operation;
      activeRef.current = true;
      void run(operation);
      return true;
    },
    [run, setProgressIfMounted]
  );

  const retry = useCallback(() => {
    const operation = operationRef.current;
    if (!operation || activeRef.current || progress.phase !== "failed") {
      return false;
    }
    activeRef.current = true;
    void run(operation);
    return true;
  }, [progress.phase, run]);

  const dismiss = useCallback(() => {
    if (activeRef.current) return;
    operationRef.current = null;
    setProgressIfMounted(initialProgress);
  }, [setProgressIfMounted]);

  const value = useMemo<SubmissionContextValue>(
    () => ({
      progress,
      active: progress.phase === "creating" || progress.phase === "finalizing",
      submit,
      retry,
      dismiss,
    }),
    [dismiss, progress, retry, submit]
  );

  return (
    <SubmissionContext.Provider value={value}>
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const context = useContext(SubmissionContext);
  if (!context)
    throw new Error("useSubmission must be used within SubmissionProvider");
  return context;
}

import { useRouter } from "next/router";
import { createContext, FC, useContext, useEffect } from "react";

import { CreateTestVariables, useCreateTest } from "../../../hooks/mutations";
import { routes } from "../../../lib/routes";
import { RunProgress } from "../../../lib/types";
import { ConnectRunnerHook, useConnectRunner } from "../hooks/connectRunner";
import { EnvHook, useEnv } from "../hooks/env";
import { RunnerHook, useRunner } from "../hooks/runner";
import { useRunProgress } from "../hooks/runProgress";
import { RunTest, useRunTest } from "../hooks/runTest";
import { SelectionHook, useSelection } from "../hooks/selection";
import { TestContext } from "./TestContext";

type RunnerContext = ConnectRunnerHook &
  EnvHook &
  RunnerHook &
  SelectionHook & {
    isCreateTestLoading: boolean;
    progress: RunProgress | null;
    runTest: RunTest["runTest"];
    shouldRequestRunner: boolean;
  };

export const RunnerContext = createContext<RunnerContext>({
  apiKey: null,
  env: null,
  isCreateTestLoading: false,
  isRunnerConnected: false,
  isRunnerLoading: false,
  mouseLineNumber: null,
  onSelectionChange: () => null,
  progress: null,
  runner: null,
  runTest: () => null,
  selection: null,
  shouldRequestRunner: false,
  wsUrl: null,
});

export const RunnerProvider: FC = ({ children }) => {
  const { env } = useEnv();
  const { mouseLineNumber, onSelectionChange, selection } = useSelection();
  const { replace } = useRouter();
  const { isRunnerConnected, runner } = useRunner();

  const { controller, run } = useContext(TestContext);

  const { progress, resetProgress } = useRunProgress({ run, runner });

  const [createTest, { loading: isCreateTestLoading }] = useCreateTest();

  const { shouldRequestRunner, runTest } = useRunTest({
    env,
    resetProgress,
    runner,
  });

  const { apiKey, isRunnerLoading, wsUrl } = useConnectRunner({
    shouldRequestRunner,
    isRunnerConnected,
    runner,
  });

  useEffect(() => {
    controller?.setRunner(runner);
  }, [controller, runner]);

  const value = {
    apiKey,
    env,
    isCreateTestLoading,
    isRunnerConnected,
    isRunnerLoading,
    mouseLineNumber,
    onSelectionChange,
    progress,
    runner,
    runTest,
    selection,
    shouldRequestRunner,
    wsUrl,
  };

  return (
    <RunnerContext.Provider value={value}>{children}</RunnerContext.Provider>
  );
};

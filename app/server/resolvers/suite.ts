import { uniq } from "lodash";

import { decrypt } from "../models/encrypt";
import { findEnvironmentOrNull } from "../models/environment";
import {
  createSuiteForTests,
  findSuite,
  findSuitesForTeam,
} from "../models/suite";
import { ensureTeamCanCreateSuite } from "../models/team";
import { findEnabledTests } from "../models/test";
import { findTriggerOrNull } from "../models/trigger";
import {
  Context,
  CreateSuiteMutation,
  IdQuery,
  SuiteResult,
  TeamIdQuery,
} from "../types";
import {
  ensureEnvironmentAccess,
  ensureSuiteAccess,
  ensureTeamAccess,
  ensureTestAccess,
  ensureUser,
} from "./utils";

const SUITES_LIMIT = 25;

/**
 * @returns The created suite ID
 */
export const createSuiteResolver = async (
  _: Record<string, unknown>,
  {
    branch,
    environment_id,
    environment_variables,
    tag_names,
    test_ids,
  }: CreateSuiteMutation,
  { db, logger, teams, user: contextUser }: Context
): Promise<string> => {
  const log = logger.prefix("createSuiteResolver");
  const user = ensureUser({ logger, user: contextUser });

  log.debug(`creator ${user.id} and environment ${environment_id}`);

  if (environment_id) {
    await ensureEnvironmentAccess({ environment_id, teams }, { db, logger });
  }

  const testTeams = await Promise.all(
    test_ids.map((test_id) => {
      return ensureTestAccess({ teams, test_id }, { db, logger });
    })
  );
  const teamIds = testTeams.map((t) => t.id);

  if (uniq(teamIds).length !== 1) {
    const message = teamIds.length
      ? "tests on different teams"
      : "no tests to run";

    log.error(message, teamIds);
    throw new Error(message);
  }

  const team = testTeams[0];
  ensureTeamCanCreateSuite(team, logger);

  const suite = await db.transaction(async (trx) => {
    const tests = await findEnabledTests(test_ids, { db: trx, logger });

    const formattedVariables = environment_variables?.length
      ? JSON.parse(environment_variables)
      : null;

    const { suite } = await createSuiteForTests(
      {
        branch,
        creator_id: user.id,
        environment_id,
        environment_variables: formattedVariables,
        team_id: team.id,
        tag_names,
        tests,
      },
      { db: trx, logger }
    );

    return suite;
  });

  return suite.id;
};

export const suiteResolver = async (
  _: Record<string, unknown>,
  { id }: IdQuery,
  { db, logger, teams }: Context
): Promise<SuiteResult> => {
  const log = logger.prefix("suiteResolver");

  log.debug("suite", id);
  await ensureSuiteAccess({ suite_id: id, teams }, { db, logger });

  const suite = await findSuite(id, { db, logger });

  const environment = suite.environment_id
    ? await findEnvironmentOrNull(suite.environment_id, { db, logger })
    : null;
  const trigger = suite.trigger_id
    ? await findTriggerOrNull(suite.trigger_id, { db, logger })
    : null;

  return {
    ...suite,
    environment_id: environment?.id || null,
    environment_name: environment?.name || null,
    environment_variables: suite.environment_variables
      ? decrypt(suite.environment_variables)
      : null,
    trigger,
  };
};

/**
 * @returns All suites for a single team, up to SUITES_LIMIT, most recent first.
 */
export const suitesResolver = async (
  _: Record<string, unknown>,
  { team_id }: TeamIdQuery,
  { db, logger, teams }: Context
): Promise<SuiteResult[]> => {
  const log = logger.prefix("suitesResolver");

  log.debug("team", team_id);
  ensureTeamAccess({ team_id, teams, logger });

  return findSuitesForTeam({ limit: SUITES_LIMIT, team_id }, { db, logger });
};

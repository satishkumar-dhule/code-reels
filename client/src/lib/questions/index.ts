import algorithms from "./algorithms.json";
import database from "./database.json";
import devops from "./devops.json";
import frontend from "./frontend.json";
import sre from "./sre.json";
import system_design from "./system-design.json";
import test_converted from "./test-converted.json";

export const questionsByChannel: Record<string, any[]> = {
  "algorithms": algorithms,
  "database": database,
  "devops": devops,
  "frontend": frontend,
  "sre": sre,
  "system-design": system_design,
  "test-converted": test_converted
};

export const allQuestions = Object.values(questionsByChannel).flat();

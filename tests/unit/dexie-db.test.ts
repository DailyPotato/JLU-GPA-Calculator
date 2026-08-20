import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { JluGpaDatabase } from '../../src/infrastructure/persistence/dexie-db';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import { makeCourse } from './test-course';

const databases: JluGpaDatabase[] = [];

function createDatabase(): JluGpaDatabase {
  const database = new JluGpaDatabase(`jlu-gpa-test-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    })
  );
});

describe('JluGpaDatabase', () => {
  it('saves courses and settings for one local student', async () => {
    const database = createDatabase();
    const course = makeCourse('1', 92, 3);
    await database.saveCourse(course);
    await database.saveRuleSet(defaultRuleSet);
    await database.saveSetting('active-rule-set', defaultRuleSet);

    expect(await database.loadCourses()).toEqual([course]);
    expect(await database.loadRuleSet(defaultRuleSet.id)).toEqual(defaultRuleSet);
    expect(await database.loadSetting('active-rule-set')).toEqual(defaultRuleSet);
  });

  it('rolls back an entire replacement when bulk insert fails', async () => {
    const database = createDatabase();
    const original = makeCourse('original', 88, 2);
    await database.saveCourse(original);
    const duplicate = makeCourse('duplicate', 90, 2);

    await expect(database.replaceCourses([duplicate, duplicate])).rejects.toThrow();
    expect(await database.loadCourses()).toEqual([original]);
  });
});

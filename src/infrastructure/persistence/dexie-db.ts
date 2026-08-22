import Dexie, { type EntityTable } from 'dexie';
import type { Course } from '../../domain/course/course.types';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';

export interface SettingRecord {
  key: string;
  value: unknown;
}

export class JluGpaDatabase extends Dexie {
  courses!: EntityTable<Course, 'id'>;
  ruleSets!: EntityTable<AppRuleSet, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;

  constructor(name = 'jlu-gpa-calculator') {
    super(name);
    this.version(1).stores({
      courses: '&id, identity.code, provenance.importBatchId',
      ruleSets: '&id, version, recommendation.college, recommendation.major',
      settings: '&key'
    });
  }

  async replaceCourses(courses: Course[]): Promise<void> {
    await this.transaction('rw', this.courses, async () => {
      await this.courses.clear();
      await this.courses.bulkAdd(courses);
    });
  }

  async appendCourses(courses: Course[]): Promise<void> {
    await this.transaction('rw', this.courses, async () => {
      await this.courses.bulkAdd(courses);
    });
  }

  async saveCourse(course: Course): Promise<void> {
    await this.courses.put(course);
  }

  async removeCourse(id: string): Promise<void> {
    await this.courses.delete(id);
  }

  async clearCourses(): Promise<void> {
    await this.courses.clear();
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.courses, this.ruleSets, this.settings, async () => {
      await Promise.all([this.courses.clear(), this.ruleSets.clear(), this.settings.clear()]);
    });
  }

  async hasAnyData(): Promise<boolean> {
    const [courseCount, ruleSetCount, settingCount] = await Promise.all([
      this.courses.count(),
      this.ruleSets.count(),
      this.settings.count()
    ]);
    return courseCount > 0 || ruleSetCount > 0 || settingCount > 0;
  }

  async loadCourses(): Promise<Course[]> {
    return this.courses.toArray();
  }

  async loadRuleSet(id: string): Promise<AppRuleSet | undefined> {
    return this.ruleSets.get(id);
  }

  async saveRuleSet(ruleSet: AppRuleSet): Promise<void> {
    await this.ruleSets.put(ruleSet);
  }

  async loadSetting<T>(key: string): Promise<T | undefined> {
    return (await this.settings.get(key))?.value as T | undefined;
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    await this.settings.put({ key, value });
  }
}

export const database = new JluGpaDatabase();

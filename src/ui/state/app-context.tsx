import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { calculateAllResults } from '../../domain/calculation/calculate';
import type { CalculationResult, Course, ResultKind } from '../../domain/course/course.types';
import { defaultRuleSet } from '../../domain/rules/recommendation.rules';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';
import { commitCourseImport } from '../../application/import-courses';
import type { ImportMergeMode, MergeResult } from '../../infrastructure/importers/import.types';
import { database } from '../../infrastructure/persistence/dexie-db';

interface AppState {
  courses: Course[];
  rules: AppRuleSet;
  ready: boolean;
  hasCalculated: boolean;
  expandedKind?: ResultKind;
  persistenceError?: string;
}

type Action =
  | { type: 'HYDRATE'; courses: Course[]; rules: AppRuleSet }
  | { type: 'SET_COURSES'; courses: Course[] }
  | { type: 'SET_RULES'; rules: AppRuleSet }
  | { type: 'CALCULATE' }
  | { type: 'TOGGLE_EXPANDED'; kind: ResultKind }
  | { type: 'SET_ERROR'; message?: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, courses: action.courses, rules: action.rules, ready: true };
    case 'SET_COURSES':
      return { ...state, courses: action.courses };
    case 'SET_RULES':
      return { ...state, rules: action.rules };
    case 'CALCULATE':
      return { ...state, hasCalculated: true };
    case 'TOGGLE_EXPANDED':
      return {
        ...state,
        expandedKind: state.expandedKind === action.kind ? undefined : action.kind
      };
    case 'SET_ERROR':
      return { ...state, persistenceError: action.message };
  }
}

export interface AllResults {
  recommendationGpa: CalculationResult;
  weightedAverage: CalculationResult;
  arithmeticAverage: CalculationResult;
}

interface AppContextValue extends AppState {
  results: AllResults;
  startCalculation: () => void;
  toggleExpanded: (kind: ResultKind) => void;
  saveCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  importCourses: (incoming: Course[], mode: ImportMergeMode) => Promise<MergeResult>;
  saveRules: (rules: AppRuleSet) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const initialState: AppState = {
  courses: [],
  rules: structuredClone(defaultRuleSet),
  ready: false,
  hasCalculated: false
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let active = true;
    Promise.all([database.loadCourses(), database.loadSetting<AppRuleSet>('active-rule-set')])
      .then(([courses, savedRules]) => {
        if (active)
          dispatch({
            type: 'HYDRATE',
            courses,
            rules: savedRules ?? structuredClone(defaultRuleSet)
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch({ type: 'HYDRATE', courses: [], rules: structuredClone(defaultRuleSet) });
        dispatch({
          type: 'SET_ERROR',
          message: error instanceof Error ? error.message : '无法读取浏览器本地数据'
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const withPersistenceError = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      const result = await operation();
      dispatch({ type: 'SET_ERROR', message: undefined });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '本地保存失败';
      dispatch({ type: 'SET_ERROR', message });
      throw error;
    }
  }, []);

  const saveCourse = useCallback(
    async (course: Course) =>
      withPersistenceError(async () => {
        await database.saveCourse(course);
        const courses = state.courses.some((item) => item.id === course.id)
          ? state.courses.map((item) => (item.id === course.id ? course : item))
          : [...state.courses, course];
        dispatch({ type: 'SET_COURSES', courses });
      }),
    [state.courses, withPersistenceError]
  );

  const deleteCourse = useCallback(
    async (id: string) =>
      withPersistenceError(async () => {
        await database.removeCourse(id);
        dispatch({
          type: 'SET_COURSES',
          courses: state.courses.filter((course) => course.id !== id)
        });
      }),
    [state.courses, withPersistenceError]
  );

  const importCourses = useCallback(
    async (incoming: Course[], mode: ImportMergeMode) =>
      withPersistenceError(async () => {
        const result = await commitCourseImport(database, state.courses, incoming, mode);
        dispatch({ type: 'SET_COURSES', courses: result.courses });
        return result;
      }),
    [state.courses, withPersistenceError]
  );

  const saveRules = useCallback(
    async (rules: AppRuleSet) =>
      withPersistenceError(async () => {
        await database.saveRuleSet(rules);
        await database.saveSetting('active-rule-set', rules);
        dispatch({ type: 'SET_RULES', rules });
      }),
    [withPersistenceError]
  );

  const results = useMemo(
    () => calculateAllResults(state.courses, state.rules),
    [state.courses, state.rules]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      results,
      startCalculation: () => dispatch({ type: 'CALCULATE' }),
      toggleExpanded: (kind) => dispatch({ type: 'TOGGLE_EXPANDED', kind }),
      saveCourse,
      deleteCourse,
      importCourses,
      saveRules
    }),
    [state, results, saveCourse, deleteCourse, importCourses, saveRules]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// The provider and its hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState 必须在 AppProvider 中使用');
  return context;
}

import { z } from 'zod';

const percentageGradeSchema = z.object({
  kind: z.literal('percentage'),
  raw: z.number().finite().min(0).max(100)
});

const levelGradeSchema = z.object({
  kind: z.literal('level'),
  raw: z.enum(['优秀', '良好', '中等', '及格', '不及格'])
});

export const courseSchema = z.object({
  id: z.string().min(1),
  identity: z.object({
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    sequenceCode: z.string().optional()
  }),
  term: z.object({
    academicYear: z.string().optional(),
    semester: z.enum(['spring', 'summer', 'autumn', 'winter', 'unknown']),
    rawText: z.string().optional()
  }),
  achievement: z.object({
    grade: z.discriminatedUnion('kind', [percentageGradeSchema, levelGradeSchema]),
    credit: z.number().finite().positive(),
    importedGradePoint: z.number().finite().nonnegative().optional(),
    passed: z.boolean().optional()
  }),
  attributes: z.object({
    courseCategory: z.string().optional(),
    courseNature: z.string().optional(),
    publicElectiveCategory: z.string().optional(),
    studyMode: z.string().optional(),
    examType: z.string().optional(),
    openingDepartment: z.string().optional(),
    isMajor: z.boolean().optional()
  }),
  record: z.object({
    isValid: z.boolean(),
    invalidReason: z.string().optional(),
    examDate: z.string().optional(),
    retakeText: z.string().optional(),
    specialReason: z.string().optional()
  }),
  control: z.object({
    userIncluded: z.boolean(),
    recommendationOverride: z.enum(['auto', 'include', 'exclude']),
    duplicateOf: z.string().optional()
  }),
  provenance: z.object({
    source: z.enum(['manual', 'jlu-sheet', 'generic-sheet', 'backup']),
    importBatchId: z.string().optional(),
    fileName: z.string().optional(),
    sheetName: z.string().optional(),
    rowNumber: z.number().int().positive().optional(),
    rawFields: z.record(z.string(), z.unknown()).optional()
  }),
  audit: z.object({
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
});

export type ParsedCourse = z.infer<typeof courseSchema>;

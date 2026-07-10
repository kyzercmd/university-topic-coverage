import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

import { 
  FACULTY, 
  COURSES, 
  DEPARTMENTS, 
  coursesByDepartment, 
  teachersForCourse,
  sectionsForTeacherCourse,
  sectionAnalytics
} from './src/lib/academic-data';

const workerEnvPath = path.join(process.cwd(), '..', 'worker', '.env');
const workerEnv = fs.readFileSync(workerEnvPath, 'utf8');
const envVars = Object.fromEntries(
  workerEnv.split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=').map(p => p.trim()))
);

const supabaseUrl = envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Seeding Supabase DB...");
  
  for (const name of FACULTY) {
    await supabase.from('faculty').upsert({ id: name, name: name });
  }

  console.log("Inserting sections and section_coverage...");
  
  const semester_id = "Summer 2026";
  let sectionCount = 0;
  let coverageCount = 0;

  for (const dept of DEPARTMENTS) {
    const deptCourses = coursesByDepartment(dept);
    for (const course of deptCourses) {
      const teachers = teachersForCourse(course);
      for (const teacher of teachers) {
        const sections = sectionsForTeacherCourse(teacher, course);
        for (const secName of sections) {
          const secId = secName;
          
          await supabase.from('sections').upsert({
            id: secId,
            name: `Section ${secName}`,
            course_id: course,
            faculty_id: teacher
          });
          sectionCount++;

          const analytics = sectionAnalytics(teacher, course, secName);
          
          const coverageData = analytics.weeklyPlan.map(plan => {
             return {
              semester_id: semester_id,
              course_id: course,
              section_id: secId,
              topic_name: plan.topic,
              material_context: `Mock material for ${plan.topic}`,
              is_covered: plan.status === "Completed"
             };
          });
          
          const { error } = await supabase.from('section_coverage').insert(coverageData);
          if (error) {
              console.log("Error inserting coverage:", error.message);
          } else {
              coverageCount += coverageData.length;
          }
        }
      }
    }
  }

  console.log(`Done! Inserted ${sectionCount} sections and ${coverageCount} coverage topics.`);
}

main().catch(console.error);

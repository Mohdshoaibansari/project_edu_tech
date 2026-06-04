# 16. Template Engine Design

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Configurable document generation for report cards, certificates, letters, and academic reports with per-school branding, layout, and data binding.

---

## 16.1 Problem

The current specification has no document generation capability beyond CSV/Excel export of attendance and exam data. Every school needs:

| Document | Variability |
|----------|-------------|
| **Report Cards** | Different layouts (portrait/landscape), sections (academic, attendance, co-curricular), grading display (grades/percentage/GPA), branding |
| **Certificates** | Merit, participation, transfer — each with different data bindings |
| **Letters** | Fee reminders, parent-teacher meeting invites, warning letters |
| **Academic Reports** | Class performance, subject-wise analysis, comparison reports |

---

## 16.2 Solution: Template-Based Document Engine

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    TEMPLATE ENGINE                             │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Template     │   │ Data Binding │   │ Rendering    │      │
│  │ Store        │──▶│ Engine       │──▶│ Engine       │──▶   │
│  │ (PostgreSQL) │   │ (Expression  │   │ (Handlebars  │      │
│  │              │   │  Evaluator)  │   │  / React-PDF │      │
│  └──────────────┘   └──────────────┘   │  / Puppeteer)│      │
│                                        └──────┬───────┘      │
│                                               │              │
│                          ┌────────────────────▼──────────┐   │
│                          │         OUTPUT FORMATS         │   │
│                          │  PDF  │  HTML  │  DOCX  │ CSV  │   │
│                          └───────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 16.3 Database Design

### Template Definition

```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(100) NOT NULL,                      -- 'report_card_term1', 'merit_certificate', 'transfer_certificate'
  name VARCHAR(200) NOT NULL,
  document_type VARCHAR(50) NOT NULL,              -- 'report_card', 'certificate', 'letter', 'report'
  description TEXT,
  template_content TEXT NOT NULL,                   -- HTML/Handlebars template
  template_engine VARCHAR(20) DEFAULT 'handlebars', -- 'handlebars', 'react-pdf', 'docx-template'
  css_content TEXT,                                -- School-branded CSS
  page_setup JSONB,                                -- { size: "A4", orientation: "portrait", margins: {...} }
  data_schema JSONB NOT NULL,                       -- Defines what data the template expects
  sample_data JSONB,                               -- For preview
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, code, version)
);
```

### Template Data Schema

```json
{
  "data_schema": {
    "student": {
      "type": "object",
      "properties": {
        "first_name": "string",
        "last_name": "string",
        "grade": "string",
        "section": "string",
        "roll_number": "string",
        "photo_url": "string"
      }
    },
    "school": {
      "type": "object",
      "properties": {
        "name": "string",
        "logo_url": "string",
        "address": "string",
        "phone": "string"
      }
    },
    "academic": {
      "type": "object",
      "properties": {
        "term": "string",
        "academic_year": "string"
      }
    },
    "subjects": {
      "type": "array",
      "items": {
        "subject_name": "string",
        "score": "number",
        "max_score": "number",
        "grade": "string",
        "grade_point": "number",
        "teacher_remarks": "string"
      }
    },
    "attendance": {
      "type": "object",
      "properties": {
        "total_days": "number",
        "present_days": "number",
        "percentage": "number"
      }
    },
    "overall": {
      "type": "object",
      "properties": {
        "total_score": "number",
        "percentage": "number",
        "grade": "string",
        "gpa": "number",
        "rank": "number",
        "result": "string",
        "principal_remarks": "string"
      }
    }
  }
}
```

### Generated Documents

```sql
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id UUID NOT NULL REFERENCES document_templates(id),
  entity_type VARCHAR(50) NOT NULL,               -- 'student', 'class', 'school'
  entity_id UUID NOT NULL,
  context JSONB NOT NULL,                          -- The data that was used for generation
  output_format VARCHAR(10) DEFAULT 'pdf',        -- 'pdf', 'html', 'docx'
  output_url TEXT,                                 -- S3 URL of generated file
  file_size BIGINT,
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  INDEX(tenant_id, entity_type, entity_id),
  INDEX(tenant_id, template_id, generated_at DESC)
);
```

---

## 16.4 Template Example — Report Card (Handlebars)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    {{{css}}}
    body {
      font-family: 'Inter', sans-serif;
      padding: 40px;
      color: #1a1a1a;
    }
    .header {
      display: flex;
      align-items: center;
      border-bottom: 3px solid {{school.primary_color}};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header img { width: 80px; margin-right: 20px; }
    .header h1 { font-size: 24px; margin: 0; }
    .header h2 { font-size: 16px; color: #666; margin: 5px 0 0 0; }
    
    .student-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 30px;
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px 15px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: {{school.primary_color}}; color: white; }
    
    .grade-{{overall.grade}} {
      font-size: 48px;
      font-weight: 700;
      color: {{school.primary_color}};
      text-align: center;
      margin: 20px 0;
    }
    
    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    {{#if school.logo_url}}
      <img src="{{school.logo_url}}" alt="School Logo" />
    {{/if}}
    <div>
      <h1>{{school.name}}</h1>
      <h2>{{academic.term}} — Academic Year {{academic.academic_year}}</h2>
    </div>
  </div>
  
  <h2 style="text-align:center; margin-bottom:30px;">STUDENT REPORT CARD</h2>
  
  <div class="student-info">
    <div><strong>Name:</strong> {{student.first_name}} {{student.last_name}}</div>
    <div><strong>Roll No:</strong> {{student.roll_number}}</div>
    <div><strong>Grade:</strong> {{student.grade}} - {{student.section}}</div>
    <div><strong>Date of Birth:</strong> {{student.date_of_birth}}</div>
  </div>
  
  <!-- Subject-wise Performance -->
  <h3>Academic Performance</h3>
  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th>Score</th>
        <th>Max</th>
        <th>Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      {{#each subjects}}
      <tr>
        <td>{{subject_name}}</td>
        <td>{{score}}</td>
        <td>{{max_score}}</td>
        <td><strong>{{grade}}</strong></td>
        <td>{{teacher_remarks}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <!-- Overall -->
  <div class="grade-{{overall.grade}}">{{overall.grade}}</div>
  
  <div class="student-info">
    <div><strong>Total:</strong> {{overall.total_score}} / {{overall.max_total}}</div>
    <div><strong>Percentage:</strong> {{overall.percentage}}%</div>
    <div><strong>GPA:</strong> {{overall.gpa}}</div>
    <div><strong>Rank:</strong> {{overall.rank}}</div>
    <div><strong>Result:</strong> {{overall.result}}</div>
  </div>
  
  <!-- Attendance -->
  <h3>Attendance</h3>
  <div class="student-info">
    <div><strong>Total Days:</strong> {{attendance.total_days}}</div>
    <div><strong>Present:</strong> {{attendance.present_days}}</div>
    <div><strong>Percentage:</strong> {{attendance.percentage}}%</div>
  </div>
  
  <div class="footer">
    <div>
      <p>________________________</p>
      <p><strong>Class Teacher</strong></p>
    </div>
    <div>
      <p>________________________</p>
      <p><strong>Principal</strong></p>
    </div>
  </div>
</body>
</html>
```

### School A (Minimal Layout):
- Header + Subjects + Overall grade + Footer

### School B (Detailed):
- Same template structure + Co-curricular section + Teacher remarks section + Parent signature

### School C (GPA Focused):
- Different CSS grid + GPA table instead of percentage + Credit hours column

---

## 16.5 Template Engine Implementation

```typescript
@Injectable()
export class TemplateEngine {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private configEngine: ConfigurationEngine,
    private rulesEngine: RulesEngine
  ) {}
  
  /**
   * Generate a document from a template
   */
  async generateDocument(
    tenantId: string,
    templateCode: string,
    entityType: string,
    entityId: string,
    outputFormat: 'pdf' | 'html' | 'docx' = 'pdf'
  ): Promise<GeneratedDocument> {
    // 1. Load template
    const template = await this.prisma.document_templates.findFirst({
      where: { tenant_id: tenantId, code: templateCode, is_active: true },
      orderBy: { version: 'desc' }
    });
    
    if (!template) throw new NotFoundError(`Template '${templateCode}' not found`);
    
    // 2. Gather data context
    const context = await this.gatherContext(tenantId, template, entityType, entityId);
    
    // 3. Validate context against data_schema
    this.validateContext(template.data_schema, context);
    
    // 4. Load school branding
    const branding = await this.configEngine.get('branding');
    
    // 5. Merge context with branding
    const mergedContext = {
      ...context,
      school: branding,
      css: template.css_content || this.getDefaultCSS(branding)
    };
    
    // 6. Render template
    let html: string;
    switch (template.template_engine) {
      case 'handlebars':
        html = this.renderHandlebars(template.template_content, mergedContext);
        break;
      case 'react-pdf':
        html = await this.renderReactPDF(template.template_content, mergedContext);
        break;
      default:
        throw new Error(`Unknown template engine: ${template.template_engine}`);
    }
    
    // 7. Convert to output format
    let outputUrl: string;
    if (outputFormat === 'pdf') {
      const pdfBuffer = await this.htmlToPdf(html, template.page_setup);
      outputUrl = await this.storage.upload(
        tenantId, `documents/${templateCode}/${entityId}.pdf`, pdfBuffer, 'application/pdf'
      );
    } else if (outputFormat === 'html') {
      outputUrl = await this.storage.upload(
        tenantId, `documents/${templateCode}/${entityId}.html`, Buffer.from(html), 'text/html'
      );
    }
    
    // 8. Record generation
    const doc = await this.prisma.generated_documents.create({
      data: {
        tenant_id: tenantId,
        template_id: template.id,
        entity_type: entityType,
        entity_id: entityId,
        context: mergedContext,
        output_format: outputFormat,
        output_url: outputUrl,
        generated_by: currentUser.id,
      }
    });
    
    return doc;
  }
  
  /**
   * Gather data context based on entity type
   */
  private async gatherContext(tenantId, template, entityType, entityId): Promise<any> {
    switch (entityType) {
      case 'student': return this.gatherStudentContext(tenantId, entityId);
      case 'class': return this.gatherClassContext(tenantId, entityId);
      case 'school': return this.gatherSchoolContext(tenantId);
      default: throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
  
  private async gatherStudentContext(tenantId, studentId) {
    const student = await this.prisma.students.findFirst({
      where: { id: studentId, tenant_id: tenantId },
      include: { user: true }
    });
    
    const examScores = await this.prisma.exam_scores.findMany({
      where: { student_id: studentId },
      include: { exam: true }
    });
    
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { student_id: studentId }
    });
    
    // Use Rules Engine for grading
    const gradingConfig = await this.configEngine.get('grading.scale');
    const academicConfig = await this.configEngine.get('academic.calendar');
    
    // Calculate overall using Rules Engine
    const overallResult = await this.rulesEngine.evaluate(
      tenantId, 'grading.convert_score',
      { score: this.calculateAverage(examScores), max_score: 100 }
    );
    
    return {
      student: {
        first_name: student.user.first_name,
        last_name: student.user.last_name,
        grade: student.grade_level,
        roll_number: student.student_id_card,
        date_of_birth: student.date_of_birth,
        photo_url: student.metadata?.photo_url
      },
      academic: {
        term: academicConfig?.terms?.[0]?.label || 'Term 1',
        academic_year: academicConfig?.year
      },
      subjects: this.formatSubjectScores(examScores, gradingConfig),
      overall: {
        total_score: this.calculateTotal(examScores),
        max_total: this.calculateMaxTotal(examScores),
        percentage: this.calculatePercentage(examScores),
        grade: overallResult?.result?.grade,
        gpa: overallResult?.result?.grade_point,
        result: overallResult?.result?.grade === 'F' ? 'FAIL' : 'PASS'
      },
      attendance: {
        total_days: attendanceRecords.length,
        present_days: this.countPresent(attendanceRecords),
        percentage: this.calculateAttendanceRate(attendanceRecords)
      }
    };
  }
  
  private renderHandlebars(template: string, context: any): string {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  }
  
  private async htmlToPdf(html: string, pageSetup: any): Promise<Buffer> {
    // Use Puppeteer or similar for server-side HTML→PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({
      format: pageSetup?.size || 'A4',
      landscape: pageSetup?.orientation === 'landscape',
      margin: pageSetup?.margins || { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });
    await browser.close();
    return Buffer.from(pdf);
  }
}
```

---

## 16.6 Template Administration UI

```
┌──────────────────────────────────────────────────────────────┐
│  📄 Template Designer                                         │
│                                                               │
│  Template: [Report Card - Term 1 ▼]   School: Green Valley   │
│                                                               │
│  ┌──────────────┬──────────────────────────────────────────┐ │
│  │  COMPONENTS  │              PREVIEW                      │ │
│  │              │                                           │ │
│  │  ☑ Header    │  ┌─────────────────────────────────┐     │ │
│  │  ☑ Student   │  │ 🏫 GREEN VALLEY SCHOOL           │     │ │
│  │    Info      │  │ Report Card — Term 1, 2026-27    │     │ │
│  │              │  │                                   │     │ │
│  │  ☑ Subject   │  │ Name: Aarav Sharma   Roll: 1001  │     │ │
│  │    Table     │  │ Grade: 10-A         DOB: 15/03   │     │ │
│  │              │  │                                   │     │ │
│  │  ☑ Grade     │  │ Subject    Score  Grade  Remarks │     │ │
│  │    Badge     │  │ Math        92    A+    Excellent│     │ │
│  │              │  │ Science     85    A     Good     │     │ │
│  │  ☑ Attendance│  │ English     78    B+    Improve  │     │ │
│  │              │  │                                   │     │ │
│  │  ☑ Footer    │  │         OVERALL: A                │     │ │
│  │              │  │     Total: 255/300  85.0%         │     │ │
│  │  ☐ Co-Curric │  │                                   │     │ │
│  │  ☐ Teacher   │  │  Class Teacher     Principal      │     │ │
│  │    Remarks   │  └─────────────────────────────────┘     │ │
│  │              │                                           │ │
│  └──────────────┴──────────────────────────────────────────┘ │
│                                                               │
│  [Preview with Sample Data]  [Preview Real Student]  [Save]  │
└──────────────────────────────────────────────────────────────┘
```

---

## 16.7 Dynamic Data Binding

### Binding Expressions

Templates use `{{path.to.data}}` syntax but with a configurable binding map so the same template works across schools with different data schemas:

```json
{
  "binding_map": {
    "student.first_name": "user.first_name",
    "school.name": "tenant.name",
    "subjects": "exam_scores WHERE term = 'current'",
    "overall.grade": "GRADING_ENGINE('grading.convert_score', overall.percentage)",
    "attendance.percentage": "RULES_ENGINE('attendance.calculate_rate', student_id, start_date, end_date)"
  }
}
```

---

> **Next:** See [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md) for the Multi-Tenant Strategy deep dive.

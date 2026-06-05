# Academic Structure Module

## Purpose
Manages the foundational academic hierarchy: grades, sections, subjects, classes, students, and staff. All entities are tenant-scoped.

## Business Rules
- **Grades** are K-12, tenant-defined (code + name + sort_order)
- **Sections** belong to a grade (e.g., Grade 5 → Section A, B, C)
- **Subjects** are tenant-defined (core vs elective via `is_core` flag)
- **Classes** link Grade + Section + Subject + Teacher + Academic Term
- **Students** have grade_level, student_id_card (auto-generated), parent references
- **Staff** have designation, qualifications, optional class_teacher role
- **Soft delete** — Students and Staff use `deleted_at` instead of hard delete

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | All CRUD operations |

## Endpoints
```
GET    /academic/grades              # List grades
POST   /academic/grades              # Create grade
GET    /academic/sections?grade_id=  # List sections
POST   /academic/sections            # Create section
GET    /academic/subjects            # List subjects
POST   /academic/subjects            # Create subject
GET    /academic/classes             # List classes (filterable)
POST   /academic/classes             # Assign class
GET    /academic/students?page=&search=  # Paginated student list
GET    /academic/students/:id        # Get student by ID
POST   /academic/students            # Enroll student
GET    /academic/staff?page=&search= # Paginated staff list
POST   /academic/staff               # Add staff
```

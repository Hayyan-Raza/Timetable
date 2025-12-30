from solver import generate_timetable
import uuid

# Minimal data to trigger the solver
data = {
    'courses': [{'id': 'C1', 'code': 'C1', 'name': 'Test', 'requiresLab': False}],
    'faculty': [{'id': 'F1', 'name': 'Fac', 'initials': 'F', 'department': 'CS'}],
    'rooms': [{'id': 'R1', 'name': 'Room', 'type': 'lecture', 'capacity': 100}],
    'allotments': [{
        'courseId': 'C1',
        'facultyId': 'F1',
        'classIds': ['Section-A']
    }]
}

try:
    print("Running solver...")
    result = generate_timetable(data)
    print("Result:", result.get('success'))
except Exception as e:
    import traceback
    traceback.print_exc()

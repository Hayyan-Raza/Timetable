"""
Configuration for the timetable solver.
Change SOLVER_TYPE to switch between algorithms.
"""

# Solver options: 'greedy' or 'cpsat'
SOLVER_TYPE = 'cpsat'  # Options: 'greedy' or 'cpsat'weight (1-3 seconds)
# SOLVER_TYPE = 'cpsat'  # Optimal but slow (30-45 minutes)

# Solver parameters
GREEDY_PARAMS = {
    'prefer_morning_slots': True,
    'max_daily_classes': 3,
    'avoid_single_class_days': True
}

CPSAT_PARAMS = {
    'max_time_in_seconds': 300,
    'num_search_workers': 8,
    'linearization_level': 2,
    'cp_model_probing_level': 2
}

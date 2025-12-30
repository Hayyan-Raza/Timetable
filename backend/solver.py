"""
Main timetable solver - routes to the configured algorithm.
Switch algorithms by changing SOLVER_TYPE in solver_config.py
"""

from solver_config import SOLVER_TYPE
import logging

logger = logging.getLogger(__name__)


def generate_timetable(data, session_id=None, progress_dict=None, existing_timetables=None):
    """
    Generate timetable using the configured solver algorithm.
    
    To switch algorithms, edit solver_config.py and change SOLVER_TYPE:
    - 'greedy': Fast lightweight algorithm (1-3 seconds) ⚡ RECOMMENDED
    - 'cpsat': Optimal but slow CP-SAT solver (30-45 minutes)
    
    Args:
        data: Dictionary with courses, faculty, rooms, allotments
        session_id: Optional session ID for progress tracking
        progress_dict: Optional dictionary for progress updates
        
    Returns:
        Dictionary with success, timetable entries, conflicts, and message
    """
    
    logger.info(f"Using solver: {SOLVER_TYPE}")
    
    if existing_timetables is None:
        existing_timetables = []
    
    if SOLVER_TYPE == 'greedy':
        from solver_greedy import generate_timetable_greedy
        return generate_timetable_greedy(data, session_id, progress_dict, existing_timetables)
    
    elif SOLVER_TYPE == 'cpsat':
        from solver_cpsat import generate_timetable_cpsat
        return generate_timetable_cpsat(data, session_id, progress_dict, existing_timetables)
    
    else:
        raise ValueError(f"Unknown solver type: {SOLVER_TYPE}. Must be 'greedy' or 'cpsat'")


from flask import Flask, request, jsonify
from flask_cors import CORS
from solver import generate_timetable
import logging
import uuid
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global dictionary to track generation progress
generation_progress = {}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "timetable-solver"})

@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        session_id = str(uuid.uuid4())
        
        logger.info(f"Received generation request for {len(data.get('courses', []))} courses (session: {session_id})")
        
        # Initialize progress tracking
        generation_progress[session_id] = {
            "status": "initializing",
            "progress": 0,
            "message": "Setting up solver...",
            "solutions_found": 0,
            "best_objective": None,
            "result": None
        }
        
        # Run generation in background thread
        def run_generation():
            try:
                # Extract existing timetables for conflict avoidance
                existing_timetables = data.get('existing_timetables', [])
                result = generate_timetable(data, session_id, generation_progress, existing_timetables)
                generation_progress[session_id]["result"] = result
                generation_progress[session_id]["status"] = "completed"
                generation_progress[session_id]["progress"] = 100
                generation_progress[session_id]["message"] = "Generation completed!"
            except Exception as e:
                logger.error(f"Error during generation: {e}")
                generation_progress[session_id]["status"] = "error"
                generation_progress[session_id]["message"] = str(e)
                generation_progress[session_id]["result"] = {"success": False, "message": str(e)}
        
        thread = threading.Thread(target=run_generation)
        thread.start()
        
        return jsonify({"session_id": session_id, "status": "started"})
    except Exception as e:
        logger.error(f"Error starting generation: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/generation-status/<session_id>', methods=['GET'])
def get_generation_status(session_id):
    if session_id not in generation_progress:
        return jsonify({"error": "Session not found"}), 404
    
    progress_data = generation_progress[session_id]
    return jsonify(progress_data)

if __name__ == '__main__':
    # Fix for PyInstaller on Windows to prevent infinite spawn loop
    import multiprocessing
    multiprocessing.freeze_support()
    
    app.run(host='0.0.0.0', port=5000, debug=False)

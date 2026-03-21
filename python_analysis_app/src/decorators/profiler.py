from functools import wraps
from pyinstrument import Profiler


def profile(func):
    """
    Decorator to profile a function's execution time and output a flamegraph.
    
    Usage:
        @profile
        def my_function():
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        profiler = Profiler()
        profiler.start()
        
        try:
            result = func(*args, **kwargs)
        finally:
            profiler.stop()
            
            # Print profile results
            print("\n" + "="*50)
            print("PROFILING RESULTS")
            print("="*50)
            profiler.print(show_all=True)
            
            # Save flamegraph to HTML
            with open("profile_flamegraph.html", "w") as f:
                f.write(profiler.output_html())
            print("Flamegraph saved to: profile_flamegraph.html")
        
        return result
    
    return wrapper
